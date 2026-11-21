'use client';

import { bytesToHex, createPublicClient, hexToBytes, http, keccak256, parseAbi } from 'viem';
import { ml_dsa87 } from '@noble/post-quantum/ml-dsa.js';
import { DIANA, diana } from '@rivet/engine/config';
import { ACTION, publishPayload, registryAbi, signingMessage } from '@rivet/engine/registry';
import { reportHash } from '@rivet/engine/canonical';

/**
 * Verifies a published attestation from THIS BROWSER, talking to the Diana RPC directly.
 * Rivet's server is not involved except (optionally) to fetch the report JSON, whose hash is
 * recomputed here. Every step is reported, pass or fail.
 */
export interface Step {
  name: string;
  ok: boolean | null; // null = informational / not applicable
  detail?: string;
}

const pqcAbi = parseAbi([
  'function pqcVerify(bytes pubkey, bytes signature, bytes message) view returns (bool)',
  'function pqcKeyStatus(address account) view returns (bool registered, uint8 algorithmId, bytes pubkey, bool possessionProven)',
]);

export async function verifyInBrowser(registry: `0x${string}`, reportId: bigint, onStep: (s: Step) => void): Promise<boolean> {
  const client = createPublicClient({ chain: diana, transport: http(DIANA.evmRpc, { retryCount: 2 }) });
  const steps: Step[] = [];
  const push = (s: Step) => { steps.push(s); onStep(s); };

  const chainId = await client.getChainId();
  push({ name: `Connected to ${DIANA.evmRpc} directly`, ok: chainId === DIANA.evmChainId, detail: `chain id ${chainId}` });

  const stored = await client.readContract({ address: registry, abi: registryAbi, functionName: 'getReport', args: [reportId] });
  push({ name: `Read report #${reportId} from contract storage`, ok: true, detail: `attester ${stored.attester}, nonce ${stored.nonce}` });
  push({ name: 'Not revoked', ok: !stored.revoked });

  // Locate the publishing block from block.timestamp (eth_getLogs is capped at 10k blocks on Diana).
  const time = async (n: bigint) => (await client.getBlock({ blockNumber: n })).timestamp;
  let hi = await client.getBlockNumber();
  let lo = hi;
  let step = 1024n;
  while (lo > 0n && (await time(lo)) >= stored.publishedAt) { hi = lo; lo = lo > step ? lo - step : 0n; step *= 2n; }
  while (hi - lo > 1n) { const mid = (lo + hi) / 2n; if ((await time(mid)) >= stored.publishedAt) hi = mid; else lo = mid; }
  const block = (await time(lo)) >= stored.publishedAt ? lo : hi;

  const logs = await client.getContractEvents({ address: registry, abi: registryAbi, eventName: 'ReportPublished', args: { reportId }, fromBlock: block, toBlock: block, strict: true });
  const ev = logs[0];
  push({ name: 'Found the ReportPublished event', ok: !!ev, detail: ev ? `block ${ev.blockNumber}, tx ${ev.transactionHash.slice(0, 18)}…` : `searched block ${block}` });
  if (!ev) return false;
  const { pubkey, signature, uri, summary } = ev.args;
  push({ name: 'Event key hash = stored key hash', ok: keccak256(pubkey) === stored.keyHash });

  const message = signingMessage({ chainId: DIANA.evmChainId, registry }, ACTION.publish, stored.attester, stored.nonce, stored.deadline, publishPayload(stored.reportHash, summary, uri));
  push({ name: 'Rebuilt the signed message locally', ok: null, detail: `${message.length} bytes, domain "RIVET/ATTEST/v1", chain ${DIANA.evmChainId}, registry ${registry.slice(0, 10)}…` });

  const t0 = performance.now();
  const localOk = ml_dsa87.verify(hexToBytes(signature), message, hexToBytes(pubkey));
  push({ name: 'ML-DSA-87 signature valid in this browser (@noble/post-quantum)', ok: localOk, detail: `${Math.round(performance.now() - t0)} ms, ${hexToBytes(signature).length}-byte signature` });

  const onchain = await client.readContract({ address: DIANA.pqcVerify, abi: pqcAbi, functionName: 'pqcVerify', args: [pubkey, signature, bytesToHex(message)] });
  push({ name: 'ML-DSA-87 signature valid on QoreChain (pqcVerify eth_call)', ok: onchain });

  const viaContract = await client.readContract({ address: registry, abi: registryAbi, functionName: 'verifyAttestation', args: [reportId, pubkey, signature] });
  push({ name: 'RivetRegistry.verifyAttestation() = true', ok: viaContract });

  const [registered, algorithmId, chainKey, possessionProven] = await client.readContract({ address: DIANA.pqcKeyStatus, abi: pqcAbi, functionName: 'pqcKeyStatus', args: [stored.attester] });
  push({ name: "Signing key is the attester's QoreChain x/pqc key", ok: registered && algorithmId === 1 && keccak256(chainKey) === stored.keyHash,
    detail: registered ? `algorithm ${algorithmId}, possession proven: ${possessionProven}` : 'no key registered' });

  return steps.every((s) => s.ok !== false);
}

/** Recompute the hash of a report JSON in the browser and compare with the on-chain value. */
export function checkReportHash(report: unknown, onchainHash: string): Step {
  const h = reportHash(report);
  return { name: 'Report JSON hash recomputed here = on-chain hash', ok: h === onchainHash, detail: h };
}
