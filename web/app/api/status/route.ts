import { ALL_IMPLS, DIANA, chainVerify, keyStatus, noble, publicClient, registryAbi, registryAddress, utf8 } from '@rivet/engine';
import { keccak256 } from 'viem';
import { json } from '@/lib/json';
import { listReports } from '@/lib/server/reports';
import { operatorMode } from '@/lib/server/operator';

export const dynamic = 'force-dynamic';

// A fixed probe: a fresh, valid ML-DSA-87 signature that the live precompile must accept.
const PROBE_SEED = new Uint8Array(32).fill(7);
const PROBE_MSG = utf8('rivet/status-probe/v1');

let cache: { at: number; body: unknown } | undefined;

async function chainStatus() {
  try {
    const [chainId, block] = await Promise.all([publicClient.getChainId(), publicClient.getBlock()]);
    const pk = await noble.publicKeyFromSeed(PROBE_SEED);
    const sig = await noble.sign(PROBE_SEED, PROBE_MSG, { deterministic: true });
    const probe = await chainVerify(pk, PROBE_MSG, sig);
    const bad = await chainVerify(pk, utf8('rivet/status-probe/v1!'), sig);
    return {
      reachable: true, chainId, blockNumber: block.number, blockTime: Number(block.timestamp),
      precompile: { address: DIANA.pqcVerify, acceptsValid: probe.valid, rejectsInvalid: !bad.valid, error: probe.error ?? bad.error },
    };
  } catch (e) {
    return { reachable: false, error: (e as Error).message.split('\n')[0] };
  }
}

async function registryStatus() {
  const address = registryAddress();
  if (!address) return { configured: false };
  try {
    const count = await publicClient.readContract({ address, abi: registryAbi, functionName: 'reportCount' });
    const attester = process.env.RIVET_ATTESTER as `0x${string}` | undefined;
    let att: unknown;
    if (attester) {
      const [keyHash, nonce, registeredAt, active] = await publicClient.readContract({ address, abi: registryAbi, functionName: 'attesters', args: [attester] });
      const ks = await keyStatus(attester);
      att = { address: attester, keyHash, nonce, registeredAt, active, chainKey: { registered: ks.registered, algorithmId: ks.algorithmId, possessionProven: ks.possessionProven, matches: ks.registered && keccak256(ks.pubkey) === keyHash } };
    }
    return { configured: true, address, reportCount: count, attester: att };
  } catch (e) {
    return { configured: true, address, error: (e as Error).message.split('\n')[0] };
  }
}

export async function GET() {
  if (cache && Date.now() - cache.at < 15_000) return json(cache.body);
  const [chain, registry, impls, reports] = await Promise.all([
    chainStatus(),
    registryStatus(),
    Promise.all(ALL_IMPLS.map(async (i) => ({ ...i.info, capabilities: i.capabilities, availability: await i.availability() }))),
    listReports(),
  ]);
  const body = {
    network: { name: 'QoreChain Diana testnet', cosmosChainId: DIANA.cosmosChainId, evmChainId: DIANA.evmChainId, evmRpc: DIANA.evmRpc, explorer: DIANA.explorer },
    chain, registry, implementations: impls,
    latestReport: reports[0] ?? null, reportCount: reports.length,
    operator: operatorMode(),
    checkedAt: new Date().toISOString(),
  };
  cache = { at: Date.now(), body };
  return json(body);
}
