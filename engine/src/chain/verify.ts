import { keccak256 } from 'viem';
import { fromHex, toHex } from '../bytes.ts';
import { noble } from '../adapters/noble.ts';
import { openssl } from '../adapters/openssl.ts';
import { reportHash } from '../report/canonical.ts';
import type { Report } from '../report/report.ts';
import { DIANA, registryAddress } from './config.ts';
import { chainVerify, keyStatus, publicClient } from './precompile.ts';
import { ACTION, publishPayload, registryAbi, signingMessage } from './registry.ts';

export interface VerifyCheck {
  name: string;
  ok: boolean;
  detail?: string;
}

/** First block whose timestamp is >= `ts`: gallop back from the head, then binary search. */
export async function blockAtTimestamp(ts: bigint): Promise<bigint> {
  const time = async (n: bigint) => (await publicClient.getBlock({ blockNumber: n })).timestamp;
  let hi = await publicClient.getBlockNumber();
  if ((await time(hi)) < ts) throw new Error(`timestamp ${ts} is after the chain head`);
  let step = 1024n;
  let lo = hi;
  while (lo > 0n && (await time(lo)) >= ts) { hi = lo; lo = lo > step ? lo - step : 0n; step *= 2n; }
  if ((await time(lo)) >= ts) return lo;
  while (hi - lo > 1n) { const mid = (lo + hi) / 2n; if ((await time(mid)) >= ts) hi = mid; else lo = mid; }
  return hi;
}

/**
 * Independent verification of a published attestation. Trusts only the chain's event log and storage:
 * rebuilds the signed message itself, then checks the ML-DSA-87 signature with two local
 * implementations AND the on-chain precompile, and (optionally) re-hashes the report JSON.
 */
export async function verifyPublished(reportId: bigint, report?: Report, registryOverride?: `0x${string}`) {
  const registry = registryOverride ?? registryAddress();
  if (!registry) throw new Error('RIVET_REGISTRY is not set');
  const checks: VerifyCheck[] = [];

  const stored = await publicClient.readContract({ address: registry, abi: registryAbi, functionName: 'getReport', args: [reportId] });
  checks.push({ name: `Report #${reportId} exists on-chain`, ok: true, detail: `attester ${stored.attester}` });
  checks.push({ name: 'Report not revoked', ok: !stored.revoked });

  // Diana's RPC caps eth_getLogs at 10,000 blocks, so locate the publishing block
  // from the stored timestamp (block.timestamp at publish) and query just that block.
  const block = await blockAtTimestamp(stored.publishedAt);
  const logs = await publicClient.getContractEvents({ address: registry, abi: registryAbi, eventName: 'ReportPublished', args: { reportId }, fromBlock: block, toBlock: block, strict: true });
  const ev = logs[0];
  if (!ev) {
    checks.push({ name: 'ReportPublished event found', ok: false });
    return { ok: false, checks, stored };
  }
  const { pubkey, signature, uri, summary } = ev.args;
  checks.push({ name: 'ReportPublished event found', ok: true, detail: `tx ${ev.transactionHash}` });
  checks.push({ name: 'Signing key matches stored key hash', ok: keccak256(pubkey) === stored.keyHash });

  const message = signingMessage({ chainId: DIANA.evmChainId, registry }, ACTION.publish, stored.attester, stored.nonce, stored.deadline, publishPayload(stored.reportHash, summary, uri));
  const [pk, sig] = [fromHex(pubkey), fromHex(signature)];
  for (const impl of [noble, openssl]) {
    const r = await impl.verify(pk, message, sig);
    checks.push({ name: `ML-DSA-87 signature valid (${impl.info.name} ${impl.info.version}, local)`, ok: r.valid, detail: r.error });
  }
  const onchain = await chainVerify(pk, message, sig);
  checks.push({ name: 'ML-DSA-87 signature valid (QoreChain pqcVerify, eth_call)', ok: onchain.valid, detail: onchain.error });
  const viaContract = await publicClient.readContract({ address: registry, abi: registryAbi, functionName: 'verifyAttestation', args: [reportId, pubkey, signature] });
  checks.push({ name: 'Registry verifyAttestation() returns true', ok: viaContract });

  const ks = await keyStatus(stored.attester);
  checks.push({ name: 'Attester key is its QoreChain x/pqc key (pqcKeyStatus)', ok: ks.registered && keccak256(ks.pubkey) === stored.keyHash,
    detail: ks.registered ? (keccak256(ks.pubkey) === stored.keyHash ? 'current chain key' : 'chain key rotated since publication') : 'not registered' });

  if (report) {
    const h = reportHash(report);
    checks.push({ name: 'Report JSON hash matches on-chain hash', ok: h === stored.reportHash, detail: h });
    const s = report.summary;
    checks.push({ name: 'Report summary matches attested summary', ok: s.passed === summary.passed && s.failed === summary.failed && s.skipped === summary.skipped && s.unsupported === summary.unsupported });
  }
  const required = checks.filter((c) => !c.name.startsWith('Attester key is its'));
  return { ok: required.every((c) => c.ok), checks, stored, event: { txHash: ev.transactionHash, blockNumber: ev.blockNumber, uri, pubkey: toHex(pk).slice(0, 18) + '…' } };
}
