/**
 * Reproduces the empty-message finding with raw `cast` calls (no viem), so the result cannot be an
 * artefact of Rivet's own ABI encoding. Prints the exact commands and outputs.
 *   node engine/scripts/empty-msg-repro.ts
 */
import { execFileSync } from 'node:child_process';
import { ml_dsa87 } from '@noble/post-quantum/ml-dsa.js';
import { toHex } from '../src/bytes.ts';
import { DIANA } from '../src/chain/config.ts';

const seed = new Uint8Array(32).fill(1);
const { publicKey, secretKey } = ml_dsa87.keygen(seed);
const cast = (...a: string[]) => execFileSync('cast', a, { encoding: 'utf8' }).trim();

for (const [label, msg] of [['empty (0 bytes)', new Uint8Array(0)], ['one zero byte', new Uint8Array(1)], ['"a"', new TextEncoder().encode('a')]] as const) {
  const sig = ml_dsa87.sign(msg, secretKey, { extraEntropy: false });
  const local = ml_dsa87.verify(sig, msg, publicKey);
  const out = cast('call', DIANA.pqcVerify, 'pqcVerify(bytes,bytes,bytes)(bool)', toHex(publicKey), toHex(sig), toHex(msg), '--rpc-url', DIANA.evmRpc);
  console.log(`${label.padEnd(16)} noble=${local}  precompile=${out}`);
}
