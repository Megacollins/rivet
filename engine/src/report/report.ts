import type { Capabilities, ImplInfo, Status, TestResult, Vector } from '../types.ts';

export const REPORT_SCHEMA = 'rivet.report/v1';
export const ENGINE_VERSION = '0.1.0';

export interface ImplementationEntry extends ImplInfo {
  available: boolean;
  reason?: string;
  capabilities: Capabilities;
}

export interface Report {
  schema: typeof REPORT_SCHEMA;
  runId: string;
  createdAt: string;
  engine: { name: 'rivet-engine'; version: string; node: string };
  network: {
    name: string;
    evmChainId: number;
    cosmosChainId: string;
    evmRpc: string;
    pqcVerify: string;
    blockNumber?: string;
    registry?: string;
  };
  implementations: ImplementationEntry[];
  vectors: Vector[];
  results: TestResult[];
  summary: ReportSummary;
}

export interface ReportSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  unsupported: number;
  critical: number;
  bySuite: Record<string, Record<Status, number>>;
}

export function summarize(results: TestResult[]): ReportSummary {
  const zero = (): Record<Status, number> => ({ pass: 0, fail: 0, skipped: 0, unsupported: 0 });
  const bySuite: Record<string, Record<Status, number>> = {};
  const all = zero();
  let critical = 0;
  for (const r of results) {
    all[r.status]++;
    (bySuite[r.suite] ??= zero())[r.status]++;
    if (r.critical && r.status === 'fail') critical++;
  }
  return { total: results.length, passed: all.pass, failed: all.fail, skipped: all.skipped, unsupported: all.unsupported, critical, bySuite };
}
