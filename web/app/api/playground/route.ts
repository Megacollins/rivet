import { randomBytes } from 'node:crypto';
import { keccak256 } from 'viem';
import { fromHex, noble, openssl, qorechain, toHex, utf8 } from '@rivet/engine';
import { json } from '@/lib/json';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SIGNERS = { noble, openssl } as const;
const VERIFIERS = [noble, openssl, qorechain];
const MAX_MESSAGE = 16 * 1024;

export type Tamper = 'none' | 'message' | 'signature' | 'key' | 'truncate';

/**
 * Sign one message with one implementation, optionally tamper with it, and ask every verifier.
 * Keys are generated per request from a random seed (or a caller-supplied one); nothing is stored.
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as {
    message?: string; encoding?: 'utf8' | 'hex'; signer?: keyof typeof SIGNERS; deterministic?: boolean; tamper?: Tamper; seedHex?: string;
  };
  let msg: Uint8Array;
  try {
    msg = b.encoding === 'hex' ? fromHex(b.message ?? '') : utf8(b.message ?? '');
  } catch {
    return json({ error: 'message is not valid hex' }, { status: 400 });
  }
  if (msg.length > MAX_MESSAGE) return json({ error: `message is over ${MAX_MESSAGE} bytes` }, { status: 400 });
  const signer = SIGNERS[b.signer ?? 'noble'];
  if (!signer) return json({ error: 'unknown signer' }, { status: 400 });
  let seed: Uint8Array;
  try {
    seed = b.seedHex ? fromHex(b.seedHex) : new Uint8Array(randomBytes(32));
  } catch {
    return json({ error: 'seed is not valid hex' }, { status: 400 });
  }
  if (seed.length !== 32) return json({ error: 'seed must be 32 bytes' }, { status: 400 });

  const avail = await signer.availability();
  if (!avail.ok) return json({ error: `${signer.info.name} unavailable: ${avail.reason}` }, { status: 503 });

  let pk: Uint8Array, sig: Uint8Array;
  const t0 = performance.now();
  try {
    pk = await signer.publicKeyFromSeed(seed);
    sig = await signer.sign(seed, msg, { deterministic: b.deterministic !== false });
  } catch (e) {
    const m = (e as Error).message;
    return json({ error: m.startsWith('UNSUPPORTED:') ? `${signer.info.name} cannot sign this input: ${m.slice(12).trim()}` : m }, { status: 422 });
  }
  const signMs = performance.now() - t0;

  // Apply the requested tamper AFTER signing: verifiers must now reject.
  let vMsg = msg, vSig = sig, vPk = pk;
  const tamper = b.tamper ?? 'none';
  if (tamper === 'message') vMsg = msg.length ? Object.assign(new Uint8Array(msg), { [0]: msg[0]! ^ 1 }) : new Uint8Array([0]);
  if (tamper === 'signature') { vSig = new Uint8Array(sig); vSig[2000] = vSig[2000]! ^ 1; }
  if (tamper === 'key') vPk = await signer.publicKeyFromSeed(new Uint8Array(randomBytes(32)));
  if (tamper === 'truncate') vSig = sig.slice(0, sig.length - 1);

  const verdicts = [];
  for (const v of VERIFIERS) {
    const a = await v.availability();
    if (!a.ok) { verdicts.push({ id: v.info.id, name: v.info.name, version: v.info.version, available: false, reason: a.reason }); continue; }
    const s = performance.now();
    const r = await v.verify(vPk, vMsg, vSig);
    verdicts.push({ id: v.info.id, name: v.info.name, version: v.info.version, available: true, valid: r.valid, error: r.error, evidence: r.evidence, ms: Math.round(performance.now() - s) });
  }

  return json({
    signer: { ...signer.info, deterministic: b.deterministic !== false, ms: Math.round(signMs) },
    tamper,
    expected: tamper === 'none' ? 'accept' : 'reject',
    message: { bytes: msg.length, hex: toHex(msg).slice(0, 130) },
    publicKey: { bytes: pk.length, keccak256: keccak256(pk), head: toHex(pk).slice(0, 66) },
    signature: { bytes: sig.length, keccak256: keccak256(sig), head: toHex(sig).slice(0, 66) },
    verdicts,
  });
}
