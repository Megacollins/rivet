'use client';

import Link from 'next/link';
import { useJson } from '@/lib/client/useJson';
import type { StatusResponse } from '@/lib/client/types';
import { Callout, Hash, PageHeader, Spinner, StatusBadge, SummaryBar, Verdict } from '@/components/ui';

export function Dashboard() {
  const { data: s, error, loading, reload } = useJson<StatusResponse>('/api/status');

  return (
    <>
      <PageHeader
        eyebrow="Post-quantum conformance · QoreChain Diana"
        title="Do your ML-DSA-87 integrations agree?"
        actions={<button className="btn-ghost" onClick={reload} disabled={loading}>{loading ? <Spinner /> : '↻'} Refresh</button>}
      >
        Rivet signs with independent ML-DSA-87 implementations, verifies every signature with every implementation and with
        QoreChain&apos;s <span className="mono text-fg">pqcVerify</span> precompile, attacks the result, and publishes a
        signed, reproducible report on-chain.
      </PageHeader>

      {error && <Callout tone="fail" title="Status unavailable">{error}</Callout>}
      {!s && !error && <div className="flex items-center gap-2 text-sm text-fg-muted"><Spinner /> Probing the live chain…</div>}

      {s && (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <ChainCard s={s} />
            <RegistryCard s={s} />
            <LatestCard s={s} />
          </div>

          <div className="card card-pad">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="label">Implementations under test</div>
                <div className="mt-1 text-sm text-fg-muted">Detected on this server. Unavailable ones are reported as unsupported, never simulated.</div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {s.implementations.map((i) => (
                <div key={i.id} className={`rounded-lg border p-3.5 ${i.availability.ok ? 'border-ink-600 bg-ink-850' : 'border-ink-700 bg-ink-900/40'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className={`text-sm font-medium ${i.availability.ok ? 'text-fg' : 'text-fg-muted'}`}>{i.name}</div>
                      <div className="mono mt-0.5 text-fg-dim">{i.version} · {i.language}</div>
                    </div>
                    <StatusBadge status={i.availability.ok ? 'pass' : 'unsupported'} label={i.availability.ok ? 'Available' : 'Unsupported'} />
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {i.availability.ok
                      ? (['sign', 'verify', 'deterministicSign', 'hedgedSign', 'context'] as const).filter((c) => i.capabilities[c]).map((c) => (
                          <span key={c} className="rounded bg-ink-700/70 px-1.5 py-0.5 text-[10.5px] text-fg-muted">{CAP[c]}</span>
                        ))
                      : <span className="text-xs leading-snug text-fg-dim">{i.availability.reason}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

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

          <Callout tone="warn" title="Finding F-1 · pqcVerify rejects valid signatures over the empty message">
            On Diana, the precompile returns <span className="mono">false</span> for a valid ML-DSA-87 signature over a 0-byte message,
            while @noble/post-quantum and OpenSSL accept it. 1-byte messages verify. This is a false rejection, not a forgery,
            and Rivet&apos;s registry never signs an empty message. <Link className="link" href="/docs#findings">Details</Link>
          </Callout>
        </div>
      )}
    </>
  );
}

const CAP = { sign: 'sign', verify: 'verify', deterministicSign: 'deterministic', hedgedSign: 'hedged', context: 'context' } as const;

function ChainCard({ s }: { s: StatusResponse }) {
  const c = s.chain;
  return (
    <div className="card card-pad">
      <div className="flex items-center justify-between">
        <div className="label">Network</div>
        <span className={`flex items-center gap-1.5 text-xs ${c.reachable ? 'text-pass-soft' : 'text-fail-soft'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${c.reachable ? 'bg-pass' : 'bg-fail'}`} />{c.reachable ? 'live' : 'unreachable'}
        </span>
      </div>
      <div className="mt-2 text-lg font-semibold">{s.network.name}</div>
      <div className="mono text-fg-dim">EVM {s.network.evmChainId} · {s.network.cosmosChainId}</div>
      {c.reachable ? (
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-fg-dim">Block</dt><dd className="mono"><a className="link" href={`${s.network.explorer}/block/${c.blockNumber}`} target="_blank" rel="noreferrer">{c.blockNumber}</a></dd></div>
          <div className="flex items-center justify-between"><dt className="text-fg-dim">pqcVerify · valid probe</dt><dd><Verdict ok={c.precompile.acceptsValid} tone={c.precompile.acceptsValid ? 'good' : 'bad'} /></dd></div>
          <div className="flex items-center justify-between"><dt className="text-fg-dim">pqcVerify · tampered probe</dt><dd><Verdict ok={!c.precompile.rejectsInvalid} tone={c.precompile.rejectsInvalid ? 'good' : 'bad'} /></dd></div>
        </dl>
      ) : <div className="mt-3 text-sm text-fail-soft">{c.error}</div>}
    </div>
  );
}

function RegistryCard({ s }: { s: StatusResponse }) {
  const r = s.registry;
  return (
    <div className="card card-pad">
      <div className="label">RivetRegistry</div>
      {!r.configured ? <div className="mt-3 text-sm text-fg-muted">Not configured (RIVET_REGISTRY unset).</div> : (
        <>
          <div className="mt-2 text-lg font-semibold tabular-nums">{r.reportCount ?? '–'} <span className="text-sm font-normal text-fg-muted">attested reports</span></div>
          <div className="mt-0.5"><Hash value={r.address!} href={`${s.network.explorer}/address/${r.address}`} /></div>
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

function LatestCard({ s }: { s: StatusResponse }) {
  const l = s.latestReport;
  return (
    <div className="card card-pad">
      <div className="label">Latest report</div>
      {!l ? <div className="mt-3 text-sm text-fg-muted">No reports yet. Run the Test Lab.</div> : (
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
