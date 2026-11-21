import { ALL_IMPLS, DIANA, chainVerify, keyStatus, noble, publicClient, registryAbi, registryAddress, utf8 } from '@rivet/engine';
import { keccak256 } from 'viem';
import { listReports } from './reports';
import { operatorMode } from './operator';

/**
 * Status checks, split so the dashboard can render each card as soon as its own data arrives.
 * Live checks are cached briefly at the CDN (see CACHE) — they describe the chain, not the visitor.
 */
// Fresh for 15 s; after that the CDN serves the last result instantly while refreshing it in the
// background. Responses carry `checkedAt`, and the UI shows that age, so a cached result is never passed off as live.
export const CACHE = { 'cache-control': 'public, s-maxage=15, stale-while-revalidate=86400' };

/** A slow RPC must not hang the page: report it as a timeout instead of waiting on viem's retries. */
export function withTimeout<T>(p: Promise<T>, ms: number, onTimeout: () => T): Promise<T> {
  let t: ReturnType<typeof setTimeout>;
  return Promise.race([p, new Promise<T>((resolve) => { t = setTimeout(() => resolve(onTimeout()), ms); })]).finally(() => clearTimeout(t));
}

export const NETWORK = {
  name: 'QoreChain Diana testnet', cosmosChainId: DIANA.cosmosChainId, evmChainId: DIANA.evmChainId, evmRpc: DIANA.evmRpc, explorer: DIANA.explorer,
};

// A fixed probe: a valid ML-DSA-87 signature the live precompile must accept, and a one-byte-changed
// message it must reject. Computed once per server instance, not per request.
const PROBE_SEED = new Uint8Array(32).fill(7);
const PROBE_MSG = utf8('rivet/status-probe/v1');
const PROBE_BAD = utf8('rivet/status-probe/v1!');
let probe: Promise<{ pk: Uint8Array; sig: Uint8Array }> | undefined;
const getProbe = () => (probe ??= (async () => ({
  pk: await noble.publicKeyFromSeed(PROBE_SEED),
  sig: await noble.sign(PROBE_SEED, PROBE_MSG, { deterministic: true }),
}))());

export async function chainStatus() {
  try {
    const { pk, sig } = await getProbe();
    const [chainId, block, good, bad] = await Promise.all([
      publicClient.getChainId(),
      publicClient.getBlock(),
      chainVerify(pk, PROBE_MSG, sig),
      chainVerify(pk, PROBE_BAD, sig),
    ]);
    return {
      reachable: true as const, chainId, blockNumber: block.number, blockTime: Number(block.timestamp),
      precompile: { address: DIANA.pqcVerify, acceptsValid: good.valid, rejectsInvalid: !bad.valid, error: good.error ?? bad.error },
    };
  } catch (e) {
    return { reachable: false as const, error: (e as Error).message.split('\n')[0] };
  }
}

export async function registryStatus() {
  const address = registryAddress();
  if (!address) return { configured: false };
  const attester = process.env.RIVET_ATTESTER as `0x${string}` | undefined;
  try {
    const [count, att, ks] = await Promise.all([
      publicClient.readContract({ address, abi: registryAbi, functionName: 'reportCount' }),
      attester ? publicClient.readContract({ address, abi: registryAbi, functionName: 'attesters', args: [attester] }) : undefined,
      attester ? keyStatus(attester) : undefined,
    ]);
    const attesterInfo = attester && att && ks ? {
      address: attester, keyHash: att[0], nonce: att[1], registeredAt: att[2], active: att[3],
      chainKey: { registered: ks.registered, algorithmId: ks.algorithmId, possessionProven: ks.possessionProven, matches: ks.registered && keccak256(ks.pubkey) === att[0] },
    } : undefined;
    return { configured: true, address, reportCount: count, attester: attesterInfo };
  } catch (e) {
    return { configured: true, address, error: (e as Error).message.split('\n')[0] };
  }
}

/** Local-only facts: no network calls, so this answers in milliseconds. */
export async function overview() {
  const [implementations, reports] = await Promise.all([
    // The precompile's availability needs a live call; the client takes it from /api/status/chain (availability: null here).
    Promise.all(ALL_IMPLS.map(async (i) => ({ ...i.info, capabilities: i.capabilities, availability: i.info.id === 'qorechain' ? null : await i.availability() }))),
    listReports(),
  ]);
  return { network: NETWORK, implementations, latestReport: reports[0] ?? null, reportCount: reports.length, operator: operatorMode() };
}
