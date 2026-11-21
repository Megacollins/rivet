import { BaseError, ContractFunctionRevertedError, keccak256, toBytes } from 'viem';
import type { TestResult } from '../types.ts';
import { equal, errMsg, toHex } from '../bytes.ts';
import { noble } from '../adapters/noble.ts';
import { DIANA } from '../chain/config.ts';
import { publicClient } from '../chain/precompile.ts';
import { ACTION, publishPayload, registryAbi, revokePayload, signingMessage, type Domain, type Summary } from '../chain/registry.ts';
import { timed } from './util.ts';

export interface ReplayConfig {
  registry: `0x${string}`;
  attester: `0x${string}`;
  /** 32-byte ML-DSA-87 seed of the attester's chain-registered key. */
  seed: Uint8Array;
}

/** Decodes a revert into the contract's custom error name, e.g. "InvalidSignature". */
function revertName(e: unknown): string {
  if (e instanceof BaseError) {
    const r = e.walk((x) => x instanceof ContractFunctionRevertedError);
    if (r instanceof ContractFunctionRevertedError) return r.data?.errorName ?? r.reason ?? 'revert';
  }
  return `error: ${errMsg(e)}`;
}

/**
 * Replay & domain-separation attacks against the DEPLOYED RivetRegistry, executed with eth_call
 * (publishReport is simulated against live state; nothing is written, no gas or EVM window needed).
 */
export async function replaySuite(cfg: ReplayConfig | undefined, runId: string): Promise<TestResult[]> {
  const skip = (reason: string): TestResult[] => [
    { id: 'replay.all', suite: 'replay', name: 'Replay & domain-separation suite', verifier: 'registry', expected: 'run', actual: 'n/a', status: 'skipped', detail: reason, durationMs: 0 },
  ];
  if (!cfg) return skip('No registry configured (set RIVET_REGISTRY, RIVET_ATTESTER and RIVET_PQC_SEED).');

  const pk = await noble.publicKeyFromSeed(cfg.seed);
  let state: readonly [`0x${string}`, bigint, bigint, boolean];
  try {
    state = await publicClient.readContract({ address: cfg.registry, abi: registryAbi, functionName: 'attesters', args: [cfg.attester] });
  } catch (e) {
    return skip(`Registry unreachable: ${errMsg(e)}`);
  }
  const [keyHash, nonce, , active] = state;
  if (keyHash !== keccak256(pk)) return skip('Attester is not registered in the registry with this ML-DSA key.');
  if (!active) return skip('Attester is deactivated.');

  const block = await publicClient.getBlock();
  const now = block.timestamp;
  const domain: Domain = { chainId: DIANA.evmChainId, registry: cfg.registry };
  const summary: Summary = { passed: 1, failed: 0, skipped: 0, unsupported: 0 };
  const uri = `rivet://replay-probe/${runId}`;
  const reportHash = keccak256(toBytes(`rivet/replay-probe/${runId}`));
  const deadline = now + 3600n;
  const payload = publishPayload(reportHash, summary, uri);
  const sign = (m: Uint8Array) => noble.sign(cfg.seed, m, { deterministic: true });
  const req = (over: Partial<{ nonce: bigint; deadline: bigint; summary: Summary }> = {}) => ({
    attester: cfg.attester, reportHash, summary: over.summary ?? summary, uri, nonce: over.nonce ?? nonce, deadline: over.deadline ?? deadline,
  });

  const results: TestResult[] = [];

  // 0. Encoding conformance: the engine's message must equal the contract's, byte for byte.
  {
    const mine = signingMessage(domain, ACTION.publish, cfg.attester, nonce, deadline, payload);
    const [theirs, ms] = await timed(() => publicClient.readContract({ address: cfg.registry, abi: registryAbi, functionName: 'signingMessage', args: [ACTION.publish, cfg.attester, nonce, deadline, payload] }));
    const same = equal(mine, toBytes(theirs));
    results.push({ id: 'replay.encoding', suite: 'replay', name: 'Engine message encoding = contract signingMessage()', verifier: 'registry', expected: 'identical bytes', actual: same ? `identical (${mine.length} bytes)` : 'differs', status: same ? 'pass' : 'fail', critical: !same, durationMs: ms });
  }

  type Case = { id: string; name: string; description: string; expect: string; build: () => Promise<{ r: ReturnType<typeof req>; sig: Uint8Array }> };
  const msgFor = (d: typeof domain, action: number, n: bigint, dl: bigint, p: `0x${string}`) => signingMessage(d, action, cfg.attester, n, dl, p);
  const cases: Case[] = [
    { id: 'control', name: 'Control: correctly signed request', description: 'Same request, correct domain — must be accepted (simulated, not sent).', expect: 'success',
      build: async () => ({ r: req(), sig: await sign(msgFor(domain, ACTION.publish, nonce, deadline, payload)) }) },
    { id: 'wrong-chain', name: 'Wrong chain ID', description: 'Signed for chain 9801 (QoreChain mainnet EVM) and replayed on Diana (9800).', expect: 'InvalidSignature',
      build: async () => ({ r: req(), sig: await sign(msgFor({ ...domain, chainId: 9801 }, ACTION.publish, nonce, deadline, payload)) }) },
    { id: 'wrong-contract', name: 'Wrong contract address', description: 'Signed for a different registry deployment.', expect: 'InvalidSignature',
      build: async () => ({ r: req(), sig: await sign(msgFor({ ...domain, registry: '0x000000000000000000000000000000000000dEaD' }, ACTION.publish, nonce, deadline, payload)) }) },
    { id: 'wrong-action', name: 'Wrong action context', description: 'A REVOKE authorisation presented as a PUBLISH.', expect: 'InvalidSignature',
      build: async () => ({ r: req(), sig: await sign(msgFor(domain, ACTION.revoke, nonce, deadline, payload)) }) },
    { id: 'revoke-payload', name: 'Payload from another action', description: 'Signature over a revoke payload (report #1) used to publish.', expect: 'InvalidSignature',
      build: async () => ({ r: req(), sig: await sign(msgFor(domain, ACTION.publish, nonce, deadline, revokePayload(1n))) }) },
    { id: 'future-nonce', name: 'Future nonce', description: `Nonce ${nonce + 1n} while the registry expects ${nonce}.`, expect: 'BadNonce',
      build: async () => { const p = req({ nonce: nonce + 1n }); return { r: p, sig: await sign(msgFor(domain, ACTION.publish, p.nonce, deadline, payload)) }; } },
    { id: 'expired', name: 'Expired deadline', description: 'Correctly signed, but the deadline is in the past.', expect: 'Expired',
      build: async () => { const p = req({ deadline: now - 1n }); return { r: p, sig: await sign(msgFor(domain, ACTION.publish, nonce, p.deadline, payload)) }; } },
    { id: 'tampered-summary', name: 'Result tampering after signing', description: 'Signed summary {1 pass}, submitted as {9 pass}.', expect: 'InvalidSignature',
      build: async () => ({ r: req({ summary: { ...summary, passed: 9 } }), sig: await sign(msgFor(domain, ACTION.publish, nonce, deadline, payload)) }) },
  ];
  if (nonce > 0n) {
    cases.push({ id: 'stale-nonce', name: 'Replayed (spent) nonce', description: `Nonce ${nonce - 1n} was already consumed.`, expect: 'BadNonce',
      build: async () => { const p = req({ nonce: nonce - 1n }); return { r: p, sig: await sign(msgFor(domain, ACTION.publish, p.nonce, deadline, payload)) }; } });
  } else {
    results.push({ id: 'replay.stale-nonce', suite: 'replay', name: 'Replayed (spent) nonce', verifier: 'registry', expected: 'BadNonce', actual: 'n/a', status: 'skipped', detail: 'Attester has not published yet, so no nonce has been spent.', durationMs: 0 });
  }

  for (const c of cases) {
    const [actual, ms] = await timed(async () => {
      try {
        const { r, sig } = await c.build();
        await publicClient.simulateContract({ address: cfg.registry, abi: registryAbi, functionName: 'publishReport', args: [r, toHex(pk), toHex(sig)], account: cfg.attester });
        return 'success';
      } catch (e) {
        return revertName(e);
      }
    });
    const ok = actual === c.expect;
    results.push({
      id: `replay.${c.id}`, suite: 'replay', name: c.name, verifier: 'registry', expected: c.expect, actual,
      status: ok ? 'pass' : 'fail', critical: !ok && c.expect !== 'success', detail: c.description,
      evidence: { rpc: DIANA.evmRpc, chainId: DIANA.evmChainId, to: cfg.registry, blockNumber: block.number?.toString() }, durationMs: ms,
    });
  }
  return results;
}
