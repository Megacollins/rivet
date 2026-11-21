import type { ReportSummary } from '@rivet/engine/report';
import type { Capabilities } from '@rivet/engine/types';

/** JSON shapes returned by the API routes (bigints arrive as decimal strings). */
export interface StatusResponse {
  network: { name: string; cosmosChainId: string; evmChainId: number; evmRpc: string; explorer: string };
  chain:
    | { reachable: true; chainId: number; blockNumber: string; blockTime: number; precompile: { address: string; acceptsValid: boolean; rejectsInvalid: boolean; error?: string } }
    | { reachable: false; error: string };
  registry: {
    configured: boolean; address?: string; reportCount?: string; error?: string;
    attester?: { address: string; keyHash: string; nonce: string; registeredAt: string; active: boolean;
      chainKey: { registered: boolean; algorithmId: number; possessionProven: boolean; matches: boolean } };
  };
  implementations: Array<{ id: string; name: string; version: string; language: string; backend: string; capabilities: Capabilities; availability: { ok: boolean; reason?: string } }>;
  latestReport: ReportListItem | null;
  reportCount: number;
  operator: { enabled: boolean; reason?: string };
  checkedAt: string;
}

export interface ReportListItem {
  runId: string;
  createdAt: string;
  hash: string;
  summary: ReportSummary;
  suites: string[];
  blockNumber?: string;
}

export interface OnchainReport {
  id: string;
  attester: string;
  reportHash: string;
  uriHash: string;
  keyHash: string;
  summary: { passed: number; failed: number; skipped: number; unsupported: number };
  nonce: string;
  deadline: string;
  publishedAt: string;
  revoked: boolean;
  localRunId: string | null;
}

export interface RegistryResponse {
  configured: boolean;
  address?: string;
  reportCount?: string;
  error?: string;
  reports: OnchainReport[];
}
