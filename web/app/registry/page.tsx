'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DIANA } from '@rivet/engine/config';
import { useJson } from '@/lib/client/useJson';
import type { OnchainReport, RegistryResponse } from '@/lib/client/types';
import { checkReportHash, verifyInBrowser, type Step } from '@/lib/client/verifyInBrowser';
import { Callout, Hash, PageHeader, Spinner, SummaryBar } from '@/components/ui';

export default function Registry() {
  const { data, error, loading, reload } = useJson<RegistryResponse>('/api/registry');
  return (
    <>
      <PageHeader eyebrow="On-chain registry" title="Attested reports on Diana"
        actions={<button className="btn-ghost" onClick={reload} disabled={loading}>{loading ? <Spinner /> : '↻'} Refresh</button>}>
        Each entry anchors a report hash and its result counts, authorised by the attester&apos;s ML-DSA-87 signature. The contract
        checked that signature with <span className="mono text-fg">pqcVerify</span> when the report was published. You can re-check it here, from your own browser.
      </PageHeader>

      {error && <Callout tone="fail">{error}</Callout>}
      {data && !data.configured && <Callout>No registry is configured on this server.</Callout>}
      {data?.address && (
        <div className="card card-pad mb-5 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
          <span><span className="text-fg-dim">Contract </span><Hash value={data.address} href={`${DIANA.explorer}/address/${data.address}`} /></span>
          <span><span className="text-fg-dim">Reports </span><b className="tabular-nums">{data.reportCount}</b></span>
          <span><span className="text-fg-dim">Network </span>Diana · EVM {DIANA.evmChainId}</span>
        </div>
      )}
      {data?.reports.length === 0 && data.configured && <Callout>No reports have been published yet.</Callout>}
      <div className="space-y-4">
        {data?.address && data.reports.map((r) => <ReportCard key={r.id} r={r} registry={data.address as `0x${string}`} />)}
      </div>
    </>
  );
}

function ReportCard({ r, registry }: { r: OnchainReport; registry: `0x${string}` }) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [state, setState] = useState<'idle' | 'running' | 'ok' | 'fail'>('idle');
  const [err, setErr] = useState<string>();
  const total = r.summary.passed + r.summary.failed + r.summary.skipped + r.summary.unsupported;

  const run = async () => {
    setSteps([]); setErr(undefined); setState('running');
    try {
      const collected: Step[] = [];
      let ok = await verifyInBrowser(registry, BigInt(r.id), (s) => { collected.push(s); setSteps([...collected]); });
      if (r.localRunId) {
        const report = await (await fetch(`/api/reports/${r.localRunId}`)).json();
        const s = checkReportHash(report, r.reportHash);
        collected.push(s); setSteps([...collected]);
        ok &&= s.ok === true;
      }
      setState(ok ? 'ok' : 'fail');
    } catch (e) {
      setErr((e as Error).message.split('\n')[0]); setState('fail');
    }
  };

  return (
    <div id={`report-${r.id}`} className="card card-pad scroll-mt-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold">Report #{r.id}</span>
            {r.revoked && <span className="rounded-full border border-fail/40 px-2 py-0.5 text-xs text-fail-soft">revoked</span>}
            <span className="text-xs text-fg-dim">{new Date(Number(r.publishedAt) * 1000).toLocaleString()}</span>
          </div>
          <div className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            <span><span className="text-fg-dim">Report hash </span><Hash value={r.reportHash} /></span>
            <span><span className="text-fg-dim">Attester </span><Hash value={r.attester} head={6} tail={4} /></span>
            <span><span className="text-fg-dim">Key hash </span><Hash value={r.keyHash} /></span>
            <span><span className="text-fg-dim">Nonce </span><span className="mono">{r.nonce}</span></span>
          </div>
          <div className="flex max-w-md items-center gap-3 pt-1">
            <SummaryBar s={{ ...r.summary, total }} />
            <span className="shrink-0 text-xs tabular-nums text-fg-muted">
              <span className="text-pass-soft">{r.summary.passed}</span> / <span className="text-fail-soft">{r.summary.failed}</span> / <span className="text-unsup-soft">{r.summary.unsupported}</span> / <span className="text-skip">{r.summary.skipped}</span>
            </span>
          </div>
          {r.localRunId
            ? <Link className="link text-sm" href={`/reports/${r.localRunId}`}>Open the full report →</Link>
            : <span className="text-xs text-fg-dim">The full report JSON is not stored on this server; the hash is still verifiable.</span>}
        </div>
        <button className="btn-primary shrink-0" onClick={run} disabled={state === 'running'}>
          {state === 'running' ? <><Spinner /> Verifying…</> : 'Verify in my browser'}
        </button>
      </div>

      {(steps.length > 0 || err) && (
        <div className="mt-5 border-t border-ink-700 pt-4">
          <ol className="space-y-1.5 text-sm">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-2.5">
                <span className={`mt-0.5 w-4 shrink-0 text-center ${s.ok === null ? 'text-blue-soft' : s.ok ? 'text-pass' : 'text-fail'}`}>{s.ok === null ? '•' : s.ok ? '✓' : '✕'}</span>
                <span className={s.ok === false ? 'text-fail-soft' : 'text-fg'}>{s.name}{s.detail && <span className="text-fg-dim"> · {s.detail}</span>}</span>
              </li>
            ))}
            {state === 'running' && <li className="flex items-center gap-2.5 text-fg-dim"><Spinner size={12} /> working…</li>}
          </ol>
          {err && <div className="mt-3"><Callout tone="fail">{err}</Callout></div>}
          {state === 'ok' && <div className="mt-3"><Callout tone="pass">Attestation independently verified in your browser, without trusting Rivet&apos;s server.</Callout></div>}
        </div>
      )}
    </div>
  );
}
