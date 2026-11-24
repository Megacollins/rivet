'use client';

import Link from 'next/link';
import { DIANA } from '@rivet/engine/config';
import { useJson } from '@/lib/client/useJson';
import type { ChainStatus, Implementation, OverviewResponse, RegistryStatus } from '@/lib/client/types';
import { Callout, Hash, PageHeader, Spinner, StatusBadge, SummaryBar, Verdict } from '@/components/ui';

/**
 * Renders immediately. Each card loads its own data, so one slow RPC call never blanks the page:
 * the local overview answers in milliseconds, the live chain and registry checks fill in as they land.
 */
export function Dashboard() {
  const overview = useJson<OverviewResponse>('/api/status/overview');
  const chain = useJson<ChainStatus>('/api/status/chain');
  const registry = useJson<RegistryStatus>('/api/status/registry');
  const loading = overview.loading || chain.loading || registry.loading;
  const refresh = () => { void overview.reload(); void chain.reload(); void registry.reload(); };

  return (
    <>
      <PageHeader
        eyebrow="Post-quantum conformance · QoreChain Diana"
        title="Do your ML-DSA-87 integrations agree?"
        actions={<button className="btn-ghost" onClick={refresh} disabled={loading}>{loading ? <Spinner /> : '↻'} Refresh</button>}
      >
        Rivet signs with independent ML-DSA-87 implementations, verifies every signature with every implementation and with
        QoreChain&apos;s <span className="mono text-fg">pqcVerify</span> precompile, attacks the result, and publishes a signed,
        reproducible report on-chain.
      </PageHeader>

      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ChainCard q={chain} />
          <RegistryCard q={registry} />
          <LatestCard q={overview} />
        </div>

        <ImplementationsCard overview={overview} chain={chain.data} />

        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/test-lab" className="card card-pad group transition hover:border-violet-glow/50">
            <div className="label text-violet-soft">Test Lab</div>
            <div className="mt-1.5 font-medium">Interoperability matrix</div>
            <p className="mt-1 text-sm text-fg-muted">Every signer × every verifier × every vector, plus determinism and key-derivation agreement. Sign your own message and watch each verifier answer.</p>
            <div className="mt-3 text-sm text-blue-soft group-hover:underline">Open Test Lab →</div>
          </Link>
          <Link href="/attack-lab" className="card card-pad group transition hover:border-violet-glow/50">
            <div className="label text-violet-soft">Attack Lab</div>
            <div className="mt-1.5 font-medium">Tampering & replay</div>
            <p className="mt-1 text-sm text-fg-muted">16 signature attacks (plus a valid control) against every verifier, and 8 replay and domain-separation attacks against the deployed registry contract.</p>
            <div className="mt-3 text-sm text-blue-soft group-hover:underline">Open Attack Lab →</div>
          </Link>
        </div>

        <Callout tone="pass" title="Finding F-1 · fixed by QoreChain at block 10,654,800">
          Rivet found that Diana&apos;s precompile returned <span className="mono">false</span> for valid ML-DSA-87 signatures over a 0-byte message,
          which @noble/post-quantum and OpenSSL accept. It now accepts them. Report #1 records the bug and report #2 the fix, both on chain.{' '}
          <Link className="link" href="/docs#findings">Details</Link>
        </Callout>
      </div>
    </>
  );
}

type Q<T> = { data?: T; error?: string; loading: boolean };

/** "just now" / "42 s ago" / "3 min ago" for a cached live check. */
function age(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 5) return 'just now';
  if (s < 90) return `${s} s ago`;
  if (s < 5400) return `${Math.round(s / 60)} min ago`;
  return `${Math.round(s / 3600)} h ago`;
}

const CAP = { sign: 'sign', verify: 'verify', deterministicSign: 'deterministic', hedgedSign: 'hedged', context: 'context' } as const;

/** Placeholder rows shaped like the content they stand in for, so the layout doesn't jump. */
function Skeleton({ rows = 3, note }: { rows?: number; note?: string }) {
  return (
    <div className="mt-3 space-y-3" aria-busy="true">
      <div className="h-5 w-2/3 animate-pulse rounded bg-ink-700/70" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex justify-between gap-4">
          <div className="h-3.5 w-28 animate-pulse rounded bg-ink-700/50" />
          <div className="h-3.5 w-16 animate-pulse rounded bg-ink-700/50" />
        </div>
      ))}
      {note && <div className="flex items-center gap-2 pt-1 text-xs text-fg-dim"><Spinner size={11} /> {note}</div>}
    </div>
  );
}

function ChainCard({ q }: { q: Q<ChainStatus> }) {
  const c = q.data;
  return (
    <div className="card card-pad">
      <div className="flex items-center justify-between">
        <div className="label">Network</div>
        {c && (
          <span className={`flex items-center gap-1.5 text-xs ${c.reachable ? 'text-pass-soft' : 'text-fail-soft'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${c.reachable ? 'bg-pass' : 'bg-fail'}`} />{c.reachable ? 'live' : 'unreachable'}
          </span>
        )}
      </div>
      <div className="mt-2 text-lg font-semibold">QoreChain Diana testnet</div>
      <div className="mono text-fg-dim">EVM {DIANA.evmChainId} · {DIANA.cosmosChainId}</div>
      {q.error && <div className="mt-3 text-sm text-fail-soft">{q.error}</div>}
      {!c && !q.error && <Skeleton rows={3} note="Probing pqcVerify on the live chain…" />}
      {c?.reachable && (
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-fg-dim">Block</dt><dd className="mono"><a className="link" href={`${DIANA.explorer}/block/${c.blockNumber}`} target="_blank" rel="noreferrer">{c.blockNumber}</a></dd></div>
          <div className="flex items-center justify-between"><dt className="text-fg-dim">pqcVerify · valid probe</dt><dd><Verdict ok={c.precompile.acceptsValid} tone={c.precompile.acceptsValid ? 'good' : 'bad'} /></dd></div>
          <div className="flex items-center justify-between"><dt className="text-fg-dim">pqcVerify · tampered probe</dt><dd><Verdict ok={!c.precompile.rejectsInvalid} tone={c.precompile.rejectsInvalid ? 'good' : 'bad'} /></dd></div>
        </dl>
      )}
      {c?.checkedAt && <div className="mt-3 text-[11px] text-fg-dim">checked {age(c.checkedAt)}</div>}
      {c && !c.reachable && <div className="mt-3 text-sm text-fail-soft">{c.error}</div>}
    </div>
  );
}

function RegistryCard({ q }: { q: Q<RegistryStatus> }) {
  const r = q.data;
  return (
    <div className="card card-pad">
      <div className="label">RivetRegistry</div>
      {q.error && <div className="mt-3 text-sm text-fail-soft">{q.error}</div>}
      {!r && !q.error && <Skeleton rows={3} note="Reading the registry contract…" />}
      {r && !r.configured && <div className="mt-3 text-sm text-fg-muted">Not configured (RIVET_REGISTRY unset).</div>}
      {r?.configured && (
        <>
          <div className="mt-2 text-lg font-semibold tabular-nums">{r.reportCount ?? '–'} <span className="text-sm font-normal text-fg-muted">attested {r.reportCount === '1' ? 'report' : 'reports'}</span></div>
          <div className="mt-0.5"><Hash value={r.address!} href={`${DIANA.explorer}/address/${r.address}`} /></div>
          {r.attester && (
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-fg-dim">Attester</dt><dd><Hash value={r.attester.address} head={6} tail={4} /></dd></div>
              <div className="flex justify-between"><dt className="text-fg-dim">Attestation nonce</dt><dd className="mono">{r.attester.nonce}</dd></div>
              <div className="flex items-center justify-between"><dt className="text-fg-dim">Key = its x/pqc key</dt><dd><Verdict ok={r.attester.chainKey.matches} yes="Matches" no="Mismatch" /></dd></div>
            </dl>
          )}
          {r.error && <div className="mt-3 text-sm text-fail-soft">{r.error}</div>}
        </>
      )}
    </div>
  );
}

function LatestCard({ q }: { q: Q<OverviewResponse> }) {
  const l = q.data?.latestReport;
  return (
    <div className="card card-pad md:col-span-2 xl:col-span-1">
      <div className="label">Latest report</div>
      {q.error && <div className="mt-3 text-sm text-fail-soft">{q.error}</div>}
      {!q.data && !q.error && <Skeleton rows={2} />}
      {q.data && !l && <div className="mt-3 text-sm text-fg-muted">No reports yet. Run the Test Lab.</div>}
      {l && (
        <>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-semibold tabular-nums text-pass-soft">{l.summary.passed}</span>
            <span className="text-sm text-fg-muted">/ {l.summary.total} passed</span>
            {l.summary.critical > 0 && <StatusBadge status="fail" critical />}
          </div>
          <div className="mt-3"><SummaryBar s={l.summary} /></div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-dim">
            <span className="text-fail-soft">{l.summary.failed} failed</span>
            <span className="text-unsup-soft">{l.summary.unsupported} unsupported</span>
            <span>{l.summary.skipped} skipped</span>
          </div>
          <div className="mt-3 text-xs text-fg-dim">{new Date(l.createdAt).toLocaleString()}</div>
          <Link className="mt-2 inline-block text-sm link" href={`/reports/${l.runId}`}>View report →</Link>
        </>
      )}
    </div>
  );
}

function ImplementationsCard({ overview, chain }: { overview: Q<OverviewResponse>; chain?: ChainStatus }) {
  // The precompile's row waits only on the chain probe; everything else is local.
  const availability = (i: Implementation) =>
    i.availability ?? (chain ? (chain.reachable && chain.precompile.acceptsValid ? { ok: true } : { ok: false, reason: chain.reachable ? 'did not accept the probe signature' : chain.error }) : null);

  return (
    <div className="card card-pad">
      <div className="mb-4">
        <div className="label">Implementations under test</div>
        <div className="mt-1 text-sm text-fg-muted">Detected on this server. Unavailable ones are reported as unsupported, never simulated.</div>
      </div>
      {overview.error && <Callout tone="fail">{overview.error}</Callout>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {!overview.data && !overview.error && Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-[92px] animate-pulse rounded-lg border border-ink-700 bg-ink-850/60" />
        ))}
        {overview.data?.implementations.map((i) => {
          const a = availability(i);
          return (
            <div key={i.id} className={`rounded-lg border p-3.5 ${a?.ok !== false ? 'border-ink-600 bg-ink-850' : 'border-ink-700 bg-ink-900/40'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className={`text-sm font-medium ${a?.ok !== false ? 'text-fg' : 'text-fg-muted'}`}>{i.name}</div>
                  <div className="mono mt-0.5 text-fg-dim">{i.version} · {i.language}</div>
                </div>
                {a
                  ? <StatusBadge status={a.ok ? 'pass' : 'unsupported'} label={a.ok ? 'Available' : 'Unsupported'} />
                  : <span className="flex items-center gap-1.5 text-[11px] text-fg-dim"><Spinner size={10} /> probing</span>}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1">
                {a?.ok === false
                  ? <span className="text-xs leading-snug text-fg-dim">{a.reason}</span>
                  : (['sign', 'verify', 'deterministicSign', 'hedgedSign', 'context'] as const).filter((c) => i.capabilities[c]).map((c) => (
                      <span key={c} className="rounded bg-ink-700/70 px-1.5 py-0.5 text-[10.5px] text-fg-muted">{CAP[c]}</span>
                    ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
