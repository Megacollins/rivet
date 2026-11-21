'use client';

import Link from 'next/link';
import type { Report } from '@rivet/engine/report';
import type { Suite } from '@rivet/engine/types';
import { useRun } from '@/lib/client/useRun';
import { ResultsTable } from './ResultsTable';
import { Callout, Hash, Spinner, StatusBadge, SummaryBar } from './ui';

/** Runs the given suites live and shows streamed progress, then the results. */
export function RunPanel({ suites, label, explorer, intro, extra }: {
  suites: Suite[]; label: string; explorer: string; intro?: React.ReactNode; extra?: (report: Report) => React.ReactNode;
}) {
  const { state, run } = useRun();
  const busy = state.phase === 'running';

  return (
    <section className="space-y-4">
      <div className="card card-pad flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-fg-muted">{intro}</div>
        <button className="btn-primary shrink-0" disabled={busy} onClick={() => run(suites)}>
          {busy ? <><Spinner /> Running…</> : label}
        </button>
      </div>

      {state.phase !== 'idle' && state.log.length > 0 && (
        <div className="card overflow-hidden">
          <div className="label border-b border-ink-700 px-4 py-2">Live log</div>
          <pre className="mono max-h-44 overflow-auto px-4 py-3 leading-relaxed text-fg-muted">
            {state.log.join('\n')}
            {busy && <span className="ml-1 inline-block h-3 w-1.5 animate-pulse bg-violet-soft align-middle" />}
          </pre>
        </div>
      )}

      {state.phase === 'error' && <Callout tone="fail" title="Run failed">{state.error}</Callout>}

      {state.phase === 'done' && (
        <>
          <div className="card card-pad space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <span className="tabular-nums"><b className="text-pass-soft">{state.report.summary.passed}</b> <span className="text-fg-dim">passed</span></span>
                <span className="tabular-nums"><b className="text-fail-soft">{state.report.summary.failed}</b> <span className="text-fg-dim">failed</span></span>
                <span className="tabular-nums"><b className="text-unsup-soft">{state.report.summary.unsupported}</b> <span className="text-fg-dim">unsupported</span></span>
                <span className="tabular-nums"><b className="text-skip">{state.report.summary.skipped}</b> <span className="text-fg-dim">skipped</span></span>
                {state.report.summary.critical > 0
                  ? <StatusBadge status="fail" critical />
                  : <span className="text-xs text-fg-dim">0 critical</span>}
              </div>
              {state.saved && <Link className="btn-ghost" href={`/reports/${state.report.runId}`}>Open report →</Link>}
            </div>
            <SummaryBar s={state.report.summary} />
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-fg-dim">
              <span>report hash <Hash value={state.hash} /></span>
              {state.report.network.blockNumber && <span>Diana block <span className="mono">{state.report.network.blockNumber}</span></span>}
              {!state.saved && <span className="text-unsup-soft">not saved (read-only filesystem)</span>}
            </div>
          </div>
          {extra?.(state.report)}
          <ResultsTable results={state.report.results} explorer={explorer} />
        </>
      )}
    </section>
  );
}
