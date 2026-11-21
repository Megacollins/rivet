import { createWalletClient, http, parseEventLogs } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { fromHex, toHex } from '../bytes.ts';
import { noble } from '../adapters/noble.ts';
import { reportHash } from '../report/canonical.ts';
import type { Report } from '../report/report.ts';
import { DIANA, diana, registryAddress } from './config.ts';
import { publicClient } from './precompile.ts';
import { ACTION, publishPayload, registryAbi, signingMessage } from './registry.ts';

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

/**
 * Publishes a report attestation. Two independent signatures are involved:
 * - the EVM transaction is signed with the operator's classical secp256k1 key (RIVET_OPERATOR_KEY);
 *   QoreChain only admits it because that account has a registered ML-DSA-87 key AND an open,
 *   scoped EVM authorisation window;
 * - the attestation itself is signed with ML-DSA-87 (RIVET_PQC_SEED) and checked by the registry
 *   through the pqcVerify precompile.
 */
export async function publishReport(report: Report, uri: string) {
  const registry = registryAddress();
  if (!registry) throw new Error('RIVET_REGISTRY is not set');
  const account = privateKeyToAccount(env('RIVET_OPERATOR_KEY') as `0x${string}`);
  const seed = fromHex(env('RIVET_PQC_SEED'));
  const attester = account.address;

  const [, nonce] = await publicClient.readContract({ address: registry, abi: registryAbi, functionName: 'attesters', args: [attester] });
  const block = await publicClient.getBlock();
  const deadline = block.timestamp + 1800n;
  const hash = reportHash(report);
  const s = report.summary;
  const summary = { passed: s.passed, failed: s.failed, skipped: s.skipped, unsupported: s.unsupported };
  const message = signingMessage({ chainId: DIANA.evmChainId, registry }, ACTION.publish, attester, nonce, deadline, publishPayload(hash, summary, uri));
  const pk = await noble.publicKeyFromSeed(seed);
  const sig = await noble.sign(seed, message, { deterministic: true });

  const args = [{ attester, reportHash: hash, summary, uri, nonce, deadline }, toHex(pk), toHex(sig)] as const;
  // Simulate first: surfaces InvalidSignature / BadNonce etc. before spending a window slot.
  const { request } = await publicClient.simulateContract({ address: registry, abi: registryAbi, functionName: 'publishReport', args, account });
  const wallet = createWalletClient({ account, chain: diana, transport: http(DIANA.evmRpc) });
  // Opening a window advances the account sequence (= EVM nonce), so always read it fresh.
  const txNonce = await publicClient.getTransactionCount({ address: attester, blockTag: 'pending' });
  const txHash = await wallet.writeContract({ ...request, nonce: txNonce });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  const [ev] = parseEventLogs({ abi: registryAbi, eventName: 'ReportPublished', logs: receipt.logs });
  return { txHash, status: receipt.status, gasUsed: receipt.gasUsed, blockNumber: receipt.blockNumber, reportId: ev?.args.reportId, reportHash: hash, attester, registry, explorer: `${DIANA.explorer}/tx/${txHash}` };
}
