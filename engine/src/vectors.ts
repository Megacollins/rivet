import { createHash } from 'node:crypto';
import type { Vector } from './types.ts';
import { toHex } from './bytes.ts';

/** Reproducible test vectors: seeds and messages are derived from fixed labels, never random. */
const sha256 = (s: string) => new Uint8Array(createHash('sha256').update(s).digest());

function pattern(len: number, label: string): Uint8Array {
  const out = new Uint8Array(len);
  let block = sha256(label);
  for (let i = 0; i < len; i++) {
    if (i % 32 === 0 && i > 0) block = sha256(label + i);
    out[i] = block[i % 32]!;
  }
  return out;
}

const def = (id: string, description: string, msg: Uint8Array): Vector => ({
  id, description, seedHex: toHex(sha256(`rivet/v1/seed/${id}`)), messageHex: toHex(msg),
});

export const VECTORS: Vector[] = [
  def('empty', 'empty message (0 bytes)', new Uint8Array(0)),
  def('abc', 'ASCII "abc" (3 bytes)', new TextEncoder().encode('abc')),
  def('hash32', '32-byte digest-sized message', sha256('rivet/v1/msg/hash32')),
  def('1k', '1 KiB pseudo-random message', pattern(1024, 'rivet/v1/msg/1k')),
  def('8k', '8 KiB pseudo-random message', pattern(8192, 'rivet/v1/msg/8k')),
];

export const ATTACK_SEED = sha256('rivet/v1/seed/attack');
export const ATTACK_OTHER_SEED = sha256('rivet/v1/seed/attack-other');
export const ATTACK_MESSAGE = new TextEncoder().encode('Rivet attack-lab base message: transfer 100 QOR to qor1rivet');
