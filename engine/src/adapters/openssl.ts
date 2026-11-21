import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { MlDsaImpl, SignOpts, VerifyOutcome } from '../types.ts';
import { errMsg } from '../bytes.ts';

const run = promisify(execFile);

// PKCS#8 / SPKI headers for ML-DSA-87 (OID 2.16.840.1.101.3.4.3.19), per
// draft-ietf-lamps-dilithium-certificates: seed-only private key, raw public key.
const PKCS8_SEED_PREFIX = Buffer.from('3034020100300b0609608648016503040313042280' + '20', 'hex');
const SPKI_PREFIX = Buffer.from('30820a32300b060960864801650304031303820a2100', 'hex');
const PK_LEN = 2592;

const privFromSeed = (seed: Uint8Array) =>
  crypto.createPrivateKey({ key: Buffer.concat([PKCS8_SEED_PREFIX, seed]), format: 'der', type: 'pkcs8' });

const pubFromRaw = (pk: Uint8Array) =>
  crypto.createPublicKey({ key: Buffer.concat([SPKI_PREFIX, pk]), format: 'der', type: 'spki' });

let cliChecked: Promise<string | null> | undefined;
/** Returns the `openssl` CLI version string if it is OpenSSL >= 3.5 (ML-DSA support), else null. */
function cliVersion(): Promise<string | null> {
  cliChecked ??= run('openssl', ['version'])
    .then(({ stdout }) => {
      const m = /OpenSSL (\d+)\.(\d+)\.(\d+)/.exec(stdout);
      if (!m) return null;
      const [maj, min] = [Number(m[1]), Number(m[2])];
      return maj > 3 || (maj === 3 && min >= 5) ? stdout.trim() : null;
    })
    .catch(() => null);
  return cliChecked;
}

/** Deterministic signing is not exposed by node:crypto, so it goes through the OpenSSL CLI. */
async function cliSignDeterministic(seed: Uint8Array, msg: Uint8Array, context?: Uint8Array): Promise<Uint8Array> {
  const dir = await mkdtemp(join(tmpdir(), 'rivet-ossl-'));
  try {
    const keyPem = privFromSeed(seed).export({ format: 'pem', type: 'pkcs8' });
    await writeFile(join(dir, 'k.pem'), keyPem, { mode: 0o600 });
    await writeFile(join(dir, 'm.bin'), msg);
    const args = ['pkeyutl', '-sign', '-rawin', '-inkey', join(dir, 'k.pem'), '-in', join(dir, 'm.bin'),
      '-pkeyopt', 'deterministic:1', '-out', join(dir, 's.bin')];
    if (context?.length) args.push('-pkeyopt', `hexcontext-string:${Buffer.from(context).toString('hex')}`);
    await run('openssl', args);
    return new Uint8Array(await readFile(join(dir, 's.bin')));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const libVersion = process.versions.openssl;
const libSupportsMlDsa = (() => {
  try {
    crypto.generateKeyPairSync('ml-dsa-87' as never);
    return true;
  } catch {
    return false;
  }
})();

/** OpenSSL (C), via Node's bundled libcrypto; deterministic mode via the `openssl` CLI when present. */
export const openssl: MlDsaImpl = {
  info: { id: 'openssl', name: 'OpenSSL', version: libVersion, language: 'C', backend: `node:crypto (Node ${process.version})` },
  capabilities: { keygenFromSeed: true, sign: true, hedgedSign: true, deterministicSign: false, context: true, verify: true },
  async availability() {
    if (!libSupportsMlDsa) return { ok: false, reason: `Node's OpenSSL ${libVersion} has no ML-DSA (needs OpenSSL >= 3.5, Node >= 24.7)` };
    const cli = await cliVersion();
    this.capabilities.deterministicSign = cli !== null;
    if (cli) this.info.backend = `node:crypto (Node ${process.version}) + CLI ${cli.split(' ').slice(0, 2).join(' ')}`;
    return { ok: true };
  },
  async publicKeyFromSeed(seed) {
    const der = crypto.createPublicKey(privFromSeed(seed)).export({ format: 'der', type: 'spki' });
    return new Uint8Array(der.subarray(der.length - PK_LEN));
  },
  async sign(seed: Uint8Array, msg: Uint8Array, opts: SignOpts) {
    if (opts.deterministic) {
      if (!(await cliVersion())) throw new Error('UNSUPPORTED: deterministic signing needs the OpenSSL >= 3.5 CLI');
      // Observed with OpenSSL 3.5.6: `pkeyutl -rawin` on a 0-byte file fails with
      // "Could not allocate 0 bytes for oneshot sign/verify buffer" (a CLI limitation, not libcrypto's).
      if (msg.length === 0) throw new Error('UNSUPPORTED: openssl pkeyutl cannot sign a 0-byte input ("Could not allocate 0 bytes for oneshot sign/verify buffer")');
      return cliSignDeterministic(seed, msg, opts.context);
    }
    const key = privFromSeed(seed);
    const sig = opts.context?.length
      ? crypto.sign(null, msg, { key, context: Buffer.from(opts.context) } as crypto.SignKeyObjectInput)
      : crypto.sign(null, msg, key);
    return new Uint8Array(sig);
  },
  async verify(pk, msg, sig, context): Promise<VerifyOutcome> {
    try {
      const key = pubFromRaw(pk);
      const valid = context?.length
        ? crypto.verify(null, msg, { key, context: Buffer.from(context) } as crypto.VerifyKeyObjectInput, sig)
        : crypto.verify(null, msg, key, sig);
      return { valid };
    } catch (e) {
      return { valid: false, error: errMsg(e) };
    }
  },
};
