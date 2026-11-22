'use client';

import Link from 'next/link';
import { useJson } from '@/lib/client/useJson';
import type { ReportListItem } from '@/lib/client/types';
import { Callout, Hash, PageHeader, Spinner, SummaryBar } from '@/components/ui';

export default function Reports() {
  const { data, error, loading } = useJson<ReportListItem[]>('/api/reports');
  return (
    <>
      <PageHeader eyebrow="Compatibility reports" title="Reports">
        Every run produces a self-contained JSON report: implementation versions, test vectors, network and pinned block,
        timestamps, and a pass / fail / skipped / unsupported verdict per test. Its identity is
        <span className="mono text-fg"> keccak256(JCS(report))</span>, the RFC 8785 canonical JSON, so anyone can recompute it.
      </PageHeader>
      {error && <Callout tone="fail">{error}</Callout>}
      {loading && !data && <div className="flex items-center gap-2 text-sm text-fg-muted"><Spinner /> Loading…</div>}
      {data && data.length === 0 && <Callout>No reports yet. Run a suite in the Test Lab or Attack Lab.</Callout>}
      {data && data.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink-700">
                {['Created', 'Suites', 'Result', '', 'Diana block', 'Report hash'].map((h, i) => <th key={i} className="label px-4 py-3 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.runId} className="border-b border-ink-800 hover:bg-ink-800/40">
                  <td className="px-4 py-3"><Link className="link" href={`/reports/${r.runId}`}>{new Date(r.createdAt).toLocaleString()}</Link></td>
                  <td className="px-4 py-3 text-fg-muted">{r.suites.join(', ')}</td>
                  <td className="px-4 py-3 tabular-nums">
                    <span className="text-pass-soft">{r.summary.passed}</span><span className="text-fg-dim"> / {r.summary.total}</span>
                    {r.summary.failed > 0 && <span className="ml-2 text-fail-soft">{r.summary.failed} failed</span>}
                    {r.summary.critical > 0 && <span className="ml-2 font-semibold text-fail">{r.summary.critical} critical</span>}
                  </td>
                  <td className="w-40 px-4 py-3"><SummaryBar s={r.summary} /></td>
                  <td className="mono px-4 py-3 text-fg-muted">{r.blockNumber ?? <span className="text-fg-dim">offline</span>}</td>
                  <td className="px-4 py-3"><Hash value={r.hash} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
