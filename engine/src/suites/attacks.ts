import type { MlDsaImpl, TestResult } from '../types.ts';
import { concat, flipBit, utf8 } from '../bytes.ts';
import { noble, nobleHashMlDsaSign } from '../adapters/noble.ts';
import { ATTACK_MESSAGE, ATTACK_OTHER_SEED, ATTACK_SEED } from '../vectors.ts';
import { mapLimit, timed } from './util.ts';

export interface AttackCase {
  id: string;
  name: string;
  description: string;
  expect: 'accept' | 'reject';
  pk: Uint8Array;
  msg: Uint8Array;
  sig: Uint8Array;
}

/** Builds the attack inputs from one valid, deterministic noble signature. */
export async function buildAttackCases(): Promise<AttackCase[]> {
  const pk = await noble.publicKeyFromSeed(ATTACK_SEED);
  const otherPk = await noble.publicKeyFromSeed(ATTACK_OTHER_SEED);
  const msg = ATTACK_MESSAGE;
  const sig = await noble.sign(ATTACK_SEED, msg, { deterministic: true });
  const ctxSig = await noble.sign(ATTACK_SEED, msg, { deterministic: true, context: utf8('rivet') });
  const preHashSig = await nobleHashMlDsaSign(ATTACK_SEED, msg);
  const otherMsgSig = await noble.sign(ATTACK_SEED, utf8('a different, also-signed message'), { deterministic: true });

  const c = (id: string, name: string, description: string, p: Partial<AttackCase>, expect: 'accept' | 'reject' = 'reject'): AttackCase =>
    ({ id, name, description, expect, pk, msg, sig, ...p });

  return [
    c('control', 'Control: untouched valid signature', 'Proves the verifier accepts genuine input, so rejections below are meaningful.', {}, 'accept'),
    c('msg-bitflip', 'Modified message (1 bit)', 'Flip the lowest bit of the first message byte.', { msg: flipBit(msg, 0) }),
    c('msg-append', 'Modified message (appended byte)', 'Append 0x00 to the signed message.', { msg: concat(msg, new Uint8Array([0])) }),
    c('msg-substitute', 'Signature moved to another message', 'A genuine signature by the same key over a different message.', { sig: otherMsgSig }),
    c('sig-bitflip-c', 'Tampered signature: challenge c̃', 'Flip a bit in the 64-byte commitment hash c̃ (byte 10).', { sig: flipBit(sig, 10) }),
    c('sig-bitflip-z', 'Tampered signature: response z', 'Flip a bit in the response vector z (byte 2000).', { sig: flipBit(sig, 2000) }),
    c('sig-bitflip-h', 'Tampered signature: hint h', 'Flip a bit in the hint encoding (last byte).', { sig: flipBit(sig, -1) }),
    c('sig-zero', 'All-zero signature', '4627 zero bytes.', { sig: new Uint8Array(sig.length) }),
    c('sig-truncated', 'Truncated signature', 'Drop the final byte (4626 bytes).', { sig: sig.slice(0, -1) }),
    c('sig-extended', 'Over-long signature', 'Append one byte (4628 bytes).', { sig: concat(sig, new Uint8Array([0])) }),
    c('pk-wrong', 'Wrong public key', 'Valid signature checked against a different valid key.', { pk: otherPk }),
    c('pk-bitflip', 'Tampered public key', 'Flip a bit in the public key t1 section (byte 100).', { pk: flipBit(pk, 100) }),
    c('pk-truncated', 'Truncated public key', 'Drop the final byte (2591 bytes).', { pk: pk.slice(0, -1) }),
    c('empty', 'Empty inputs', 'Zero-length key, message and signature.', { pk: new Uint8Array(0), msg: new Uint8Array(0), sig: new Uint8Array(0) }),
    c('ctx-mismatch', 'Context-string confusion', 'Signed with FIPS 204 context "rivet", verified with the empty context.', { sig: ctxSig }),
    c('prehash-confusion', 'HashML-DSA presented as ML-DSA', 'SHA-512 HashML-DSA signature verified as pure ML-DSA.', { sig: preHashSig }),
    c('swap-pk-sig', 'Key and signature swapped', 'Signature bytes passed as the key and vice versa.', { pk: sig, sig: pk }),
  ];
}

export async function attackSuite(verifiers: MlDsaImpl[], cases: AttackCase[]): Promise<TestResult[]> {
  const cells = cases.flatMap((c) => verifiers.map((v) => ({ c, v })));
  return mapLimit(cells, 4, async ({ c, v }): Promise<TestResult> => {
    const [out, ms] = await timed(() => v.verify(c.pk, c.msg, c.sig));
    const actual = out.valid ? 'accept' : out.error ? 'reject (error)' : 'reject';
    const ok = (c.expect === 'accept') === out.valid;
    return {
      id: `attack.${c.id}.${v.info.id}`,
      suite: 'attack',
      name: c.name,
      verifier: v.info.id,
      expected: c.expect,
      actual,
      status: ok ? 'pass' : 'fail',
      // Only an ACCEPTED attack is a security failure; a rejected control is a conformance failure.
      critical: !ok && c.expect === 'reject',
      detail: [c.description, out.error && `verifier said: ${out.error}`].filter(Boolean).join(' — '),
      evidence: out.evidence,
      durationMs: ms,
    };
  });
}
