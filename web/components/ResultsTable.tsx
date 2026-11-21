'use client';

import { useMemo, useState } from 'react';
import type { Status, TestResult } from '@rivet/engine/types';
import { StatusBadge } from './ui';

const FILTERS: Array<Status | 'all'> = ['all', 'pass', 'fail', 'unsupported', 'skipped'];

export function ResultsTable({ results, explorer }: { results: TestResult[]; explorer?: string }) {
  const [filter, setFilter] = useState<Status | 'all'>(() => (results.some((r) => r.status === 'fail') ? 'all' : 'all'));
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: results.length };
    for (const r of results) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [results]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return results
      .filter((r) => filter === 'all' || r.status === filter)
      .filter((r) => !needle || `${r.name} ${r.verifier} ${r.signer ?? ''} ${r.vector ?? ''} ${r.detail ?? ''}`.toLowerCase().includes(needle))
      .sort((a, b) => rank(a) - rank(b));
  }, [results, filter, q]);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-ink-700 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-md px-2.5 py-1 text-xs capitalize transition ${filter === f ? 'bg-ink-700 text-fg' : 'text-fg-muted hover:bg-ink-800'}`}>
              {f} <span className="ml-0.5 tabular-nums text-fg-dim">{counts[f] ?? 0}</span>
            </button>
          ))}
        </div>
        <input className="input sm:max-w-60" placeholder="Filter tests…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="text-fg-dim">
            <tr className="border-b border-ink-700">
              <th className="label px-4 py-2.5 font-medium">Test</th>
              <th className="label px-3 py-2.5 font-medium">Verifier</th>
              <th className="label px-3 py-2.5 font-medium">Expected</th>
              <th className="label px-3 py-2.5 font-medium">Actual</th>
              <th className="label px-3 py-2.5 font-medium">Status</th>
              <th className="label px-3 py-2.5 text-right font-medium">ms</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Row key={r.id} r={r} open={open === r.id} toggle={() => setOpen(open === r.id ? null : r.id)} explorer={explorer} />
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-fg-dim">No tests match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const rank = (r: TestResult) => ({ fail: 0, pass: 2, unsupported: 3, skipped: 4 })[r.status] - (r.critical ? 1 : 0);

function Row({ r, open, toggle, explorer }: { r: TestResult; open: boolean; toggle: () => void; explorer?: string }) {
  const tint = r.status === 'fail' ? 'bg-fail/[0.04]' : '';
  return (
    <>
      <tr className={`cursor-pointer border-b border-ink-800 transition hover:bg-ink-800/50 ${tint}`} onClick={toggle}>
        <td className="px-4 py-2.5">
          <div className="text-fg">{r.name}</div>
          {r.detail && <div className="mt-0.5 line-clamp-1 text-xs text-fg-dim">{r.detail}</div>}
        </td>
        <td className="px-3 py-2.5 text-fg-muted">{r.verifier}</td>
        <td className="px-3 py-2.5 text-fg-muted">{r.expected}</td>
        <td className={`px-3 py-2.5 ${r.status === 'fail' ? 'text-fail-soft' : 'text-fg-muted'}`}>{r.actual}</td>
        <td className="px-3 py-2.5"><StatusBadge status={r.status} critical={r.critical} /></td>
        <td className="px-3 py-2.5 text-right tabular-nums text-fg-dim">{Math.round(r.durationMs)}</td>
      </tr>
      {open && (
        <tr className="border-b border-ink-800 bg-ink-950/50">
          <td colSpan={6} className="px-4 py-3">
            <dl className="grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-[140px_1fr]">
              <dt className="text-fg-dim">Test id</dt><dd className="mono break-all text-fg-muted">{r.id}</dd>
              <dt className="text-fg-dim">Suite</dt><dd className="text-fg-muted">{r.suite}</dd>
              {r.signer && <><dt className="text-fg-dim">Signer</dt><dd className="text-fg-muted">{r.signer}</dd></>}
              {r.vector && <><dt className="text-fg-dim">Vector</dt><dd className="mono text-fg-muted">{r.vector}</dd></>}
              {r.detail && <><dt className="text-fg-dim">Detail</dt><dd className="break-words text-fg-muted">{r.detail}</dd></>}
              {r.evidence?.rpc && <><dt className="text-fg-dim">RPC</dt><dd className="mono text-fg-muted">{r.evidence.rpc} (chain {r.evidence.chainId})</dd></>}
              {r.evidence?.blockNumber && (
                <><dt className="text-fg-dim">Pinned block</dt>
                <dd className="mono text-fg-muted">{explorer ? <a className="link" href={`${explorer}/block/${r.evidence.blockNumber}`} target="_blank" rel="noreferrer">{r.evidence.blockNumber}</a> : r.evidence.blockNumber}</dd></>
              )}
              {r.evidence?.to && <><dt className="text-fg-dim">Call target</dt><dd className="mono text-fg-muted">{r.evidence.to}</dd></>}
              {r.evidence?.calldataHash && <><dt className="text-fg-dim">keccak(calldata)</dt><dd className="mono break-all text-fg-muted">{r.evidence.calldataHash}</dd></>}
              {r.evidence?.revert && <><dt className="text-fg-dim">Revert</dt><dd className="mono text-fg-muted">{r.evidence.revert}</dd></>}
            </dl>
          </td>
        </tr>
      )}
    </>
  );
}
