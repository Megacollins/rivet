'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Report } from '@rivet/engine/report';
import { DIANA } from '@rivet/engine/config';
import { useJson } from '@/lib/client/useJson';
import type { OverviewResponse, RegistryResponse } from '@/lib/client/types';
import { InteropMatrix } from '@/components/InteropMatrix';
import { ResultsTable } from '@/components/ResultsTable';
import { Callout, Hash, PageHeader, Spinner, StatusBadge, SummaryBar } from '@/components/ui';
import { canonicalReportHash } from '@/lib/client/hash';

export function ReportView({ id }: { id: string }) {
  const { data: report, error } = useJson<Report>(`/api/reports/${id}`);
  const { data: reg, reload } = useJson<RegistryResponse>('/api/registry');
  const { data: status } = useJson<OverviewResponse>('/api/status/overview');
  const hash = useMemo(() => (report ? canonicalReportHash(report) : undefined), [report]);
  const onchain = reg?.reports.find((r) => r.reportHash === hash);
  const [pub, setPub] = useState<{ busy: boolean; error?: string; tx?: string }>({ busy: false });

  const publish = async () => {
    setPub({ busy: true });
    try {
      const r = await fetch(`/api/reports/${id}/publish`, { method: 'POST' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      setPub({ busy: false, tx: j.txHash });
      await reload();
    } catch (e) {
      setPub({ busy: false, error: (e as Error).message });
    }
  };

  if (error) return <Callout tone="fail" title="Report not found">{error}</Callout>;
  if (!report || !hash) return <div className="flex items-center gap-2 text-sm text-fg-muted"><Spinner /> Loading report…</div>;
  const s = report.summary;

  return (
    <>
      <PageHeader
        eyebrow={<Link href="/reports" className="hover:text-fg">← Reports</Link>}
        title={`Report ${report.runId.slice(0, 8)}`}
        actions={<a className="btn-ghost" href={`/api/reports/${id}?download=1`}>Download JSON</a>}
      >
        {new Date(report.createdAt).toLocaleString()} · {report.engine.name} {report.engine.version} · Node {report.engine.node}
      </PageHeader>

      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="card card-pad">
            <div className="label">Summary</div>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <span className="text-3xl font-semibold tabular-nums text-pass-soft">{s.passed}<span className="text-base font-normal text-fg-dim"> / {s.total} passed</span></span>
              <span className="tabular-nums text-fail-soft">{s.failed} failed</span>
              <span className="tabular-nums text-unsup-soft">{s.unsupported} unsupported</span>
              <span className="tabular-nums text-skip">{s.skipped} skipped</span>
              {s.critical > 0 ? <StatusBadge status="fail" critical /> : <span className="text-xs text-fg-dim">0 critical</span>}
            </div>
            <div className="mt-4"><SummaryBar s={s} /></div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {Object.entries(s.bySuite).map(([suite, c]) => (
                <div key={suite} className="flex items-center justify-between rounded-lg bg-ink-850 px-3 py-2 text-sm">
                  <span className="capitalize text-fg-muted">{suite}</span>
                  <span className="tabular-nums"><span className="text-pass-soft">{c.pass}</span> · <span className="text-fail-soft">{c.fail}</span> · <span className="text-unsup-soft">{c.unsupported}</span> · <span className="text-skip">{c.skipped}</span></span>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-pad">
            <div className="label">Identity & attestation</div>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-fg-dim">Report hash</dt><dd><Hash value={hash} /></dd></div>
              <div className="flex justify-between gap-3"><dt className="text-fg-dim">Network</dt><dd className="text-right text-fg-muted">{report.network.name}<div className="mono text-fg-dim">EVM {report.network.evmChainId}</div></dd></div>
              <div className="flex justify-between gap-3"><dt className="text-fg-dim">Pinned block</dt><dd className="mono">{report.network.blockNumber
                ? <a className="link" href={`${DIANA.explorer}/block/${report.network.blockNumber}`} target="_blank" rel="noreferrer">{report.network.blockNumber}</a>
                : <span className="text-fg-dim">offline run</span>}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-fg-dim">On-chain</dt><dd>{onchain
                ? <Link className="link" href={`/registry#report-${onchain.id}`}>Report #{onchain.id}{onchain.revoked ? ' (revoked)' : ''}</Link>
                : <span className="text-fg-dim">not published</span>}</dd></div>
            </dl>
            {!onchain && (
              <div className="mt-4 border-t border-ink-700 pt-4">
                {status?.operator.enabled ? (
                  <>
                    <button className="btn-primary w-full" disabled={pub.busy} onClick={publish}>{pub.busy ? <><Spinner /> Publishing…</> : 'Sign with ML-DSA-87 & publish'}</button>
                    <p className="mt-2 text-xs leading-relaxed text-fg-dim">The attestation is signed with the attester&apos;s ML-DSA-87 key and checked on-chain by pqcVerify. The EVM transaction itself is ECDSA-signed and is admitted only inside the operator&apos;s registry-scoped EVM window.</p>
                  </>
                ) : (
                  <p className="text-xs text-fg-dim">Publishing is disabled on this server: {status?.operator.reason ?? '…'}.</p>
                )}
                {pub.error && <div className="mt-2"><Callout tone="fail">{pub.error}</Callout></div>}
                {pub.tx && <div className="mt-2 text-xs text-pass-soft">Published in tx <Hash value={pub.tx} href={`${DIANA.explorer}/tx/${pub.tx}`} /></div>}
              </div>
            )}
          </div>
        </div>

        <div className="card card-pad">
          <div className="label mb-3">Implementations</div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {report.implementations.map((i) => (
              <div key={i.id} className="flex items-start justify-between gap-2 rounded-lg bg-ink-850 px-3 py-2.5 text-sm">
                <div>
                  <div className={i.available ? 'text-fg' : 'text-fg-muted'}>{i.name}</div>
                  <div className="mono text-fg-dim">{i.version}</div>
                  {!i.available && <div className="mt-1 text-xs text-fg-dim">{i.reason}</div>}
                </div>
                <StatusBadge status={i.available ? 'pass' : i.id === 'qorechain' ? 'skipped' : 'unsupported'}
                  label={i.available ? 'Available' : i.id === 'qorechain' ? 'Not contacted' : 'Unsupported'} />
              </div>
            ))}
          </div>
        </div>

        <InteropMatrix report={report} />

        <details className="card card-pad">
          <summary className="label cursor-pointer">Test vectors ({report.vectors.length})</summary>
          <div className="mt-3 space-y-2">
            {report.vectors.map((v) => (
              <div key={v.id} className="rounded-lg bg-ink-850 px-3 py-2 text-xs">
                <div className="text-fg">{v.id} <span className="text-fg-dim">— {v.description}</span></div>
                <div className="mono mt-1 break-all text-fg-dim">seed {v.seedHex}</div>
                <div className="mono break-all text-fg-dim">msg {v.messageHex.length > 120 ? `${v.messageHex.slice(0, 120)}… (${(v.messageHex.length - 2) / 2} bytes)` : v.messageHex || '(empty)'}</div>
              </div>
            ))}
          </div>
        </details>

        <ResultsTable results={report.results} explorer={DIANA.explorer} />
      </div>
    </>
  );
}
