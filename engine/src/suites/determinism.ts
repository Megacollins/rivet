import type { MlDsaImpl, TestResult, Vector } from '../types.ts';
import { equal, errMsg, fromHex, toHex } from '../bytes.ts';
import { keccak256 } from 'viem';
import { timed } from './util.ts';

const short = (b: Uint8Array) => keccak256(b).slice(0, 18);

/**
 * FIPS 204 determinism: from the same 32-byte seed every implementation must derive the same key pair,
 * and deterministic signing must give byte-identical signatures. Hedged signing must NOT repeat.
 */
export async function determinismSuite(signers: MlDsaImpl[], vectors: Vector[]): Promise<TestResult[]> {
  const out: TestResult[] = [];
  const keyImpls = signers.filter((s) => s.capabilities.keygenFromSeed);
  if (keyImpls.length < 2) {
    out.push({ id: 'determinism.keygen', suite: 'determinism', name: 'Key derivation agreement', verifier: 'n/a', expected: '≥2 implementations', actual: `${keyImpls.length}`, status: 'unsupported', durationMs: 0 });
    return out;
  }
  const [ref, ...others] = keyImpls as [MlDsaImpl, ...MlDsaImpl[]];

  for (const v of vectors) {
    const seed = fromHex(v.seedHex);
    const msg = fromHex(v.messageHex);
    for (const other of others) {
      const [res, ms] = await timed(async () => {
        try {
          const [a, b] = [await ref.publicKeyFromSeed(seed), await other.publicKeyFromSeed(seed)];
          return { a, b };
        } catch (e) {
          return { err: errMsg(e) };
        }
      });
      const base = { suite: 'determinism' as const, signer: ref.info.id, verifier: other.info.id, vector: v.id, durationMs: ms };
      if ('err' in res) {
        out.push({ ...base, id: `determinism.keygen.${other.info.id}.${v.id}`, name: `Key from seed: ${ref.info.name} = ${other.info.name}`, expected: 'identical public key', actual: 'error', status: 'fail', detail: res.err });
      } else {
        const same = equal(res.a!, res.b!);
        out.push({ ...base, id: `determinism.keygen.${other.info.id}.${v.id}`, name: `Key from seed: ${ref.info.name} = ${other.info.name}`, expected: 'identical public key',
          actual: same ? `identical (${short(res.a!)})` : `differs (${short(res.a!)} vs ${short(res.b!)})`, status: same ? 'pass' : 'fail' });
      }

      const id = `determinism.sign.${other.info.id}.${v.id}`;
      const name = `Deterministic signature: ${ref.info.name} = ${other.info.name}`;
      if (!ref.capabilities.deterministicSign || !other.capabilities.deterministicSign) {
        const who = !other.capabilities.deterministicSign ? other : ref;
        out.push({ ...base, id, name, expected: 'identical signature', actual: 'n/a', status: 'unsupported', detail: `${who.info.name}: deterministic signing unavailable in this build` });
        continue;
      }
      const [sres, sms] = await timed(async () => {
        try {
          const a = await ref.sign(seed, msg, { deterministic: true });
          const b = await other.sign(seed, msg, { deterministic: true });
          return { a, b };
        } catch (e) {
          return { err: errMsg(e) };
        }
      });
      if ('err' in sres && sres.err?.startsWith('UNSUPPORTED:')) {
        out.push({ ...base, id, name, durationMs: sms, expected: 'identical signature', actual: 'n/a', status: 'unsupported', detail: sres.err.slice(13) });
      } else if ('err' in sres) {
        out.push({ ...base, id, name, durationMs: sms, expected: 'identical signature', actual: 'error', status: 'fail', detail: sres.err });
      } else {
        const same = equal(sres.a!, sres.b!);
        out.push({ ...base, id, name, durationMs: sms, expected: 'identical signature',
          actual: same ? `identical (${short(sres.a!)})` : `differs (${short(sres.a!)} vs ${short(sres.b!)})`, status: same ? 'pass' : 'fail' });
      }
    }
  }

  // Hedged signing must use fresh randomness (a repeat would indicate a broken RNG path).
  const v0 = vectors[0]!;
  for (const s of signers.filter((x) => x.capabilities.hedgedSign)) {
    const seed = fromHex(v0.seedHex);
    const msg = fromHex(v0.messageHex);
    const [r, ms] = await timed(async () => [await s.sign(seed, msg, { deterministic: false }), await s.sign(seed, msg, { deterministic: false })] as const);
    const differ = !equal(r[0], r[1]);
    out.push({ id: `determinism.hedged.${s.info.id}`, suite: 'determinism', name: `Hedged signing is randomised: ${s.info.name}`, signer: s.info.id, verifier: s.info.id, vector: v0.id,
      expected: 'two different signatures', actual: differ ? 'different' : `identical ${toHex(r[0]).slice(0, 18)}`, status: differ ? 'pass' : 'fail', durationMs: ms });
  }
  return out;
}
