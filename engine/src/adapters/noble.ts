import { ml_dsa87 } from '@noble/post-quantum/ml-dsa.js';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MlDsaImpl, SignOpts, VerifyOutcome } from '../types.ts';
import { errMsg } from '../bytes.ts';

// The installed version is reported in every result, so it is read from disk, never hard-coded.
// The package's exports map hides package.json: under Node, read it next to the resolved entry point;
// under a bundler (Next.js), where import.meta.resolve is unavailable, find it in node_modules.
function installedVersion(): string {
  const read = (p: string) => (JSON.parse(readFileSync(p, 'utf8')) as { version: string }).version;
  if (typeof import.meta.resolve === 'function') {
    return read(fileURLToPath(new URL('./package.json', import.meta.resolve('@noble/post-quantum/ml-dsa.js'))));
  }
  for (let dir = process.cwd(); ; dir = path.dirname(dir)) {
    const p = path.join(dir, 'node_modules', '@noble', 'post-quantum', 'package.json');
    if (existsSync(p)) return read(p);
    if (path.dirname(dir) === dir) return 'unknown';
  }
}
const version = installedVersion();

/** @noble/post-quantum: audited pure-TypeScript implementation (Paul Miller). */
export const noble: MlDsaImpl = {
  info: { id: 'noble', name: '@noble/post-quantum', version, language: 'TypeScript', backend: 'pure JS, in-process' },
  capabilities: { keygenFromSeed: true, sign: true, hedgedSign: true, deterministicSign: true, context: true, verify: true },
  async availability() {
    return { ok: true };
  },
  async publicKeyFromSeed(seed) {
    return ml_dsa87.keygen(seed).publicKey;
  },
  async sign(seed: Uint8Array, msg: Uint8Array, opts: SignOpts) {
    const { secretKey } = ml_dsa87.keygen(seed);
    return ml_dsa87.sign(msg, secretKey, {
      extraEntropy: opts.deterministic ? false : undefined,
      context: opts.context,
    });
  },
  async verify(pk, msg, sig, context): Promise<VerifyOutcome> {
    try {
      return { valid: ml_dsa87.verify(sig, msg, pk, { context }) };
    } catch (e) {
      return { valid: false, error: errMsg(e) };
    }
  },
};

/** HashML-DSA (FIPS 204 §5.4, SHA-512 pre-hash) signer, used only to build attack inputs. */
export async function nobleHashMlDsaSign(seed: Uint8Array, msg: Uint8Array): Promise<Uint8Array> {
  const { sha512 } = await import('@noble/hashes/sha2.js');
  const { secretKey } = ml_dsa87.keygen(seed);
  return ml_dsa87.prehash(sha512).sign(msg, secretKey, { extraEntropy: false });
}
