import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalize, reportHash } from '../src/report/canonical.ts';
import { noble } from '../src/adapters/noble.ts';
import { openssl } from '../src/adapters/openssl.ts';
import { signingMessage, DOMAIN_TAG, ACTION } from '../src/chain/registry.ts';
import { buildAttackCases, attackSuite } from '../src/suites/attacks.ts';
import { runAll } from '../src/runner.ts';
import { VECTORS } from '../src/vectors.ts';
import { fromHex } from '../src/bytes.ts';

test('JCS canonicalisation: key order, nesting, undefined dropped', () => {
  assert.equal(canonicalize({ b: 1, a: [true, null, 'x'], c: { z: 1, y: 'é' }, u: undefined }), '{"a":[true,null,"x"],"b":1,"c":{"y":"é","z":1}}');
  // RFC 8785 sorts by UTF-16 code units, so "€" (€) sorts before "😀" (😀) and after "a".
  assert.equal(canonicalize({ '😀': 1, '€': 2, a: 3 }), '{"a":3,"€":2,"😀":1}');
  assert.equal(reportHash({ x: 1, y: 2 }), reportHash({ y: 2, x: 1 }));
});

test('noble and OpenSSL derive identical keys and cross-verify', async () => {
  assert.ok((await openssl.availability()).ok, 'OpenSSL with ML-DSA must be available (Node >= 24.7)');
  for (const v of VECTORS) {
    const seed = fromHex(v.seedHex);
    const msg = fromHex(v.messageHex);
    const [pkN, pkO] = [await noble.publicKeyFromSeed(seed), await openssl.publicKeyFromSeed(seed)];
    assert.deepEqual(pkN, pkO, `key mismatch for ${v.id}`);
    const sN = await noble.sign(seed, msg, { deterministic: false });
    const sO = await openssl.sign(seed, msg, { deterministic: false });
    assert.ok((await openssl.verify(pkN, msg, sN)).valid, `openssl rejects noble sig (${v.id})`);
    assert.ok((await noble.verify(pkO, msg, sO)).valid, `noble rejects openssl sig (${v.id})`);
  }
});

test('context strings are honoured by both libraries', async () => {
  const seed = fromHex(VECTORS[1]!.seedHex);
  const msg = fromHex(VECTORS[1]!.messageHex);
  const ctx = new TextEncoder().encode('rivet');
  const pk = await noble.publicKeyFromSeed(seed);
  const s = await openssl.sign(seed, msg, { deterministic: false, context: ctx });
  assert.ok((await noble.verify(pk, msg, s, ctx)).valid);
  assert.equal((await noble.verify(pk, msg, s)).valid, false);
});

test('signing message: domain tag prefix and 7 ABI words', () => {
  const m = signingMessage({ chainId: 9800, registry: '0x1111111111111111111111111111111111111111' }, ACTION.publish,
    '0x2222222222222222222222222222222222222222', 3n, 99n, `0x${'ab'.repeat(32)}`);
  assert.equal(m.length, DOMAIN_TAG.length + 7 * 32);
  assert.equal(new TextDecoder().decode(m.slice(0, DOMAIN_TAG.length)), 'RIVET/ATTEST/v1');
  // The first 4 bytes, read as QoreChain's v1 hybrid frame length, can never match the message.
  assert.ok(Buffer.from(m.slice(0, 4)).readUInt32BE(0) > m.length);
});

test('attack lab: every attack is rejected by both local verifiers, control accepted', async () => {
  const results = await attackSuite([noble, openssl], await buildAttackCases());
  for (const r of results) assert.equal(r.status, 'pass', `${r.id}: expected ${r.expected}, got ${r.actual}`);
  assert.ok(results.some((r) => r.id.startsWith('attack.control') && r.actual === 'accept'));
});

test('offline run: chain is reported as skipped, never faked', async () => {
  const report = await runAll({ offline: true, suites: ['attack'] });
  const chain = report.implementations.find((i) => i.id === 'qorechain')!;
  assert.equal(chain.available, false);
  assert.ok(report.results.some((r) => r.id === 'impl.qorechain' && r.status === 'skipped'));
  assert.ok(!report.results.some((r) => r.verifier === 'qorechain' && r.status === 'pass'));
  assert.equal(report.summary.critical, 0);
});
