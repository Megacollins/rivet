/** Live tests against QoreChain Diana (read-only eth_call). Run with: npm -w engine run test:live */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noble } from '../src/adapters/noble.ts';
import { chainVerify, qorechain, keyStatus } from '../src/chain/precompile.ts';
import { attackSuite, buildAttackCases } from '../src/suites/attacks.ts';
import { utf8 } from '../src/bytes.ts';

const seed = new Uint8Array(32).fill(9);

test('Diana precompile is reachable and active', async () => {
  const a = await qorechain.availability();
  assert.ok(a.ok, a.reason);
});

test('precompile accepts a valid ML-DSA-87 signature (noble + OpenSSL-signed)', async () => {
  const pk = await noble.publicKeyFromSeed(seed);
  const msg = utf8('rivet live test');
  assert.equal((await chainVerify(pk, msg, await noble.sign(seed, msg, { deterministic: true }))).valid, true);
  const { openssl } = await import('../src/adapters/openssl.ts');
  assert.equal((await chainVerify(pk, msg, await openssl.sign(seed, msg, { deterministic: false }))).valid, true);
});

test('KNOWN DIVERGENCE: precompile rejects a valid signature over the empty message', async () => {
  const pk = await noble.publicKeyFromSeed(seed);
  const empty = new Uint8Array(0);
  const sig = await noble.sign(seed, empty, { deterministic: true });
  assert.equal((await noble.verify(pk, empty, sig)).valid, true, 'FIPS 204 reference accepts');
  // If this ever starts passing, QoreChain fixed it: update docs/FINDINGS.md.
  assert.equal((await chainVerify(pk, empty, sig)).valid, false);
});

test('precompile rejects every Attack Lab case', async () => {
  const results = await attackSuite([qorechain], await buildAttackCases());
  for (const r of results) assert.equal(r.status, 'pass', `${r.id}: expected ${r.expected}, got ${r.actual}`);
});

test('pqcKeyStatus returns the 4-field shape for an unregistered account', async () => {
  const s = await keyStatus('0x000000000000000000000000000000000000dEaD');
  assert.equal(s.registered, false);
  assert.equal(s.pubkey, '0x');
});
