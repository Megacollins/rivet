import type { MlDsaImpl, TestResult, Vector } from '../types.ts';
import { errMsg, fromHex } from '../bytes.ts';
import { mapLimit, timed } from './util.ts';

interface Signed {
  signer: MlDsaImpl;
  mode: 'hedged' | 'deterministic';
  vector: Vector;
  pk?: Uint8Array;
  sig?: Uint8Array;
  error?: string;
}

/**
 * Interop matrix: every signing implementation x signing mode x vector, verified by every verifier
 * (including QoreChain's live precompile). A valid signature must be accepted everywhere.
 */
export async function interopSuite(signers: MlDsaImpl[], verifiers: MlDsaImpl[], vectors: Vector[]): Promise<TestResult[]> {
  const jobs: Signed[] = [];
  for (const signer of signers) {
    for (const mode of ['hedged', 'deterministic'] as const) {
      const supported = mode === 'hedged' ? signer.capabilities.hedgedSign : signer.capabilities.deterministicSign;
      for (const vector of vectors) jobs.push({ signer, mode, vector, error: supported ? undefined : 'unsupported' });
    }
  }

  for (const j of jobs) {
    if (j.error) continue;
    try {
      const seed = fromHex(j.vector.seedHex);
      j.pk = await j.signer.publicKeyFromSeed(seed);
      j.sig = await j.signer.sign(seed, fromHex(j.vector.messageHex), { deterministic: j.mode === 'deterministic' });
    } catch (e) {
      j.error = errMsg(e);
    }
  }

  const cells = jobs.flatMap((j) => verifiers.map((v) => ({ j, v })));
  const results = await mapLimit(cells, 4, async ({ j, v }): Promise<TestResult> => {
    const base = {
      id: `interop.${j.signer.info.id}.${j.mode}.${j.vector.id}.${v.info.id}`,
      suite: 'interop' as const,
      name: `${j.signer.info.name} (${j.mode}) → ${v.info.name}`,
      signer: j.signer.info.id,
      verifier: v.info.id,
      vector: j.vector.id,
      expected: 'accept',
    };
    if (j.error === 'unsupported') {
      return { ...base, actual: 'n/a', status: 'unsupported', detail: `${j.signer.info.name} does not support ${j.mode} signing in this build`, durationMs: 0 };
    }
    if (j.error?.startsWith('UNSUPPORTED:')) {
      return { ...base, actual: 'n/a', status: 'unsupported', detail: j.error.slice(13), durationMs: 0 };
    }
    if (j.error || !j.sig || !j.pk) {
      return { ...base, actual: 'n/a', status: 'skipped', detail: `signing failed: ${j.error}`, durationMs: 0 };
    }
    const [out, ms] = await timed(() => v.verify(j.pk!, fromHex(j.vector.messageHex), j.sig!));
    return {
      ...base,
      actual: out.valid ? 'accept' : 'reject',
      status: out.valid ? 'pass' : 'fail',
      // A rejected valid signature is a conformance failure, not a security failure.
      critical: false,
      detail: out.error,
      evidence: out.evidence,
      durationMs: ms,
    };
  });

  // Flag disagreements: same signature, verifiers reach different verdicts.
  const groups = new Map<string, TestResult[]>();
  for (const r of results) {
    if (r.status !== 'pass' && r.status !== 'fail') continue;
    const k = `${r.signer}.${r.id.split('.')[2]}.${r.vector}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  for (const g of groups.values()) {
    const accepted = g.filter((r) => r.actual === 'accept').map((r) => r.verifier);
    if (accepted.length === 0 || accepted.length === g.length) continue;
    for (const r of g.filter((x) => x.actual === 'reject')) {
      r.detail = [`DIVERGENCE: rejected a signature accepted by ${accepted.join(', ')}`, r.detail].filter(Boolean).join(' — ');
    }
  }
  return results;
}
