import { randomUUID } from 'node:crypto';
import type { MlDsaImpl, Suite, TestResult } from './types.ts';
import { fromHex } from './bytes.ts';
import { noble } from './adapters/noble.ts';
import { openssl } from './adapters/openssl.ts';
import { bouncycastle, circl, liboqs } from './adapters/unsupported.ts';
import { DIANA, registryAddress } from './chain/config.ts';
import { pinBlock, qorechain } from './chain/precompile.ts';
import { interopSuite } from './suites/interop.ts';
import { determinismSuite } from './suites/determinism.ts';
import { attackSuite, buildAttackCases } from './suites/attacks.ts';
import { replaySuite, type ReplayConfig } from './suites/replay.ts';
import { VECTORS } from './vectors.ts';
import { ENGINE_VERSION, REPORT_SCHEMA, summarize, type ImplementationEntry, type Report } from './report/report.ts';

export const ALL_IMPLS: MlDsaImpl[] = [noble, openssl, qorechain, circl, liboqs, bouncycastle];

export interface RunOptions {
  suites?: Suite[];
  /** Skip the live chain (offline run). The precompile is then reported as skipped, never faked. */
  offline?: boolean;
  replay?: ReplayConfig;
  onProgress?: (msg: string) => void;
}

export function replayConfigFromEnv(): ReplayConfig | undefined {
  const registry = registryAddress();
  const attester = process.env.RIVET_ATTESTER as `0x${string}` | undefined;
  const seedHex = process.env.RIVET_PQC_SEED;
  if (!registry || !attester || !seedHex) return undefined;
  return { registry, attester, seed: fromHex(seedHex) };
}

export async function runAll(opts: RunOptions = {}): Promise<Report> {
  const suites = new Set<Suite>(opts.suites ?? ['interop', 'determinism', 'attack', 'replay']);
  const log = opts.onProgress ?? (() => {});
  const runId = randomUUID();

  const implementations: ImplementationEntry[] = [];
  const available: MlDsaImpl[] = [];
  for (const impl of ALL_IMPLS) {
    const a = impl.info.id === 'qorechain' && opts.offline ? { ok: false, reason: 'offline run: live chain not contacted' } : await impl.availability();
    implementations.push({ ...impl.info, available: a.ok, reason: a.reason, capabilities: { ...impl.capabilities } });
    if (a.ok) available.push(impl);
    log(`${a.ok ? '✓' : '·'} ${impl.info.name} ${impl.info.version}${a.ok ? '' : ` — ${a.reason}`}`);
  }
  const chainUp = available.some((i) => i.info.id === 'qorechain');
  const blockNumber = chainUp ? (await pinBlock()).toString() : undefined;
  if (blockNumber) log(`pinned Diana block ${blockNumber}`);

  const signers = available.filter((i) => i.capabilities.sign);
  const verifiers = available.filter((i) => i.capabilities.verify);
  const results: TestResult[] = [];

  // Unavailable implementations are recorded once, as unsupported — never silently dropped.
  for (const e of implementations.filter((x) => !x.available)) {
    results.push({ id: `impl.${e.id}`, suite: 'interop', name: `${e.name} availability`, verifier: e.id, expected: 'available', actual: 'unavailable',
      status: e.id === 'qorechain' ? 'skipped' : 'unsupported', detail: e.reason, durationMs: 0 });
  }

  if (suites.has('interop')) {
    log('interop matrix…');
    results.push(...(await interopSuite(signers, verifiers, VECTORS)));
  }
  if (suites.has('determinism')) {
    log('determinism…');
    results.push(...(await determinismSuite(signers, VECTORS)));
  }
  if (suites.has('attack')) {
    log('attack lab…');
    results.push(...(await attackSuite(verifiers, await buildAttackCases())));
  }
  if (suites.has('replay')) {
    log('replay & domain separation…');
    results.push(...(chainUp ? await replaySuite(opts.replay, runId) : await replaySuite(undefined, runId)));
  }

  return {
    schema: REPORT_SCHEMA,
    runId,
    createdAt: new Date().toISOString(),
    engine: { name: 'rivet-engine', version: ENGINE_VERSION, node: process.version },
    network: { name: 'QoreChain Diana testnet', evmChainId: DIANA.evmChainId, cosmosChainId: DIANA.cosmosChainId, evmRpc: DIANA.evmRpc, pqcVerify: DIANA.pqcVerify, blockNumber, registry: opts.replay?.registry },
    implementations,
    vectors: VECTORS,
    results,
    summary: summarize(results),
  };
}
