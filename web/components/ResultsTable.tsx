'use client';

import { useMemo, useState } from 'react';
import type { Status, TestResult } from '@rivet/engine/types';
import { StatusBadge } from './ui';

const FILTERS: Array<Status | 'all'> = ['all', 'pass', 'fail', 'unsupported', 'skipped'];

export function ResultsTable({ results, explorer }: { results: TestResult[]; explorer?: string }) {
  const [filter, setFilter] = useState<Status | 'all'>('all');
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
      {/* Below md: one card per test (no sideways scrolling). md and up: the full table. */}
      <ul className="divide-y divide-ink-800 md:hidden">
        {rows.map((r) => <MobileRow key={r.id} r={r} open={open === r.id} toggle={() => setOpen(open === r.id ? null : r.id)} explorer={explorer} />)}
        {rows.length === 0 && <li className="px-4 py-8 text-center text-sm text-fg-dim">No tests match.</li>}
      </ul>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-[13px]">
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
          <td colSpan={6} className="px-4 py-3"><Details r={r} explorer={explorer} /></td>
        </tr>
      )}
    </>
  );
}

function MobileRow({ r, open, toggle, explorer }: { r: TestResult; open: boolean; toggle: () => void; explorer?: string }) {
  return (
    <li className={r.status === 'fail' ? 'bg-fail/[0.04]' : ''}>
      <button type="button" onClick={toggle} aria-expanded={open} className="block w-full px-4 py-3 text-left transition hover:bg-ink-800/50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 text-[13.5px] text-fg">{r.name}</div>
          <div className="shrink-0"><StatusBadge status={r.status} critical={r.critical} /></div>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-fg-dim">
          <span>{r.verifier}</span>
          <span>expected <span className="text-fg-muted">{r.expected}</span></span>
          <span>actual <span className={r.status === 'fail' ? 'text-fail-soft' : 'text-fg-muted'}>{r.actual}</span></span>
          <span className="tabular-nums">{Math.round(r.durationMs)} ms</span>
        </div>
        {r.detail && !open && <div className="mt-1 line-clamp-2 text-xs text-fg-dim">{r.detail}</div>}
      </button>
      {open && <div className="bg-ink-950/50 px-4 pb-3 pt-1"><Details r={r} explorer={explorer} /></div>}
    </li>
  );
}

function Details({ r, explorer }: { r: TestResult; explorer?: string }) {
  return (
    <dl className="grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-[140px_minmax(0,1fr)]">
      <dt className="text-fg-dim">Test id</dt><dd className="mono break-all text-fg-muted">{r.id}</dd>
      <dt className="text-fg-dim">Suite</dt><dd className="text-fg-muted">{r.suite}</dd>
      {r.signer && <><dt className="text-fg-dim">Signer</dt><dd className="text-fg-muted">{r.signer}</dd></>}
      {r.vector && <><dt className="text-fg-dim">Vector</dt><dd className="mono text-fg-muted">{r.vector}</dd></>}
      {r.detail && <><dt className="text-fg-dim">Detail</dt><dd className="break-words text-fg-muted">{r.detail}</dd></>}
      {r.evidence?.rpc && <><dt className="text-fg-dim">RPC</dt><dd className="mono break-all text-fg-muted">{r.evidence.rpc} (chain {r.evidence.chainId})</dd></>}
      {r.evidence?.blockNumber && (
        <><dt className="text-fg-dim">Pinned block</dt>
        <dd className="mono text-fg-muted">{explorer ? <a className="link" href={`${explorer}/block/${r.evidence.blockNumber}`} target="_blank" rel="noreferrer">{r.evidence.blockNumber}</a> : r.evidence.blockNumber}</dd></>
      )}
      {r.evidence?.to && <><dt className="text-fg-dim">Call target</dt><dd className="mono break-all text-fg-muted">{r.evidence.to}</dd></>}
      {r.evidence?.calldataHash && <><dt className="text-fg-dim">keccak(calldata)</dt><dd className="mono break-all text-fg-muted">{r.evidence.calldataHash}</dd></>}
      {r.evidence?.revert && <><dt className="text-fg-dim">Revert</dt><dd className="mono break-words text-fg-muted">{r.evidence.revert}</dd></>}
    </dl>
  );
}
