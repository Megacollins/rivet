'use client';

import { useJson } from '@/lib/client/useJson';
import type { ChainStatus, RegistryStatus } from '@/lib/client/types';

/** Live facts from the Diana testnet, fetched on load. Nothing here is a placeholder number. */
export function LiveStrip() {
  const chain = useJson<ChainStatus>('/api/status/chain');
  const reg = useJson<RegistryStatus>('/api/status/registry');
  const c = chain.data;

  const items: Array<{ label: string; value: React.ReactNode; ok?: boolean }> = [
    { label: 'Diana block', value: c?.reachable ? <span className="mono text-[13px]">{Number(c.blockNumber).toLocaleString('en-US')}</span> : null },
    { label: 'pqcVerify · valid signature', value: c?.reachable ? (c.precompile.acceptsValid ? 'accepted' : 'rejected') : null, ok: c?.reachable ? c.precompile.acceptsValid : undefined },
    { label: 'pqcVerify · tampered signature', value: c?.reachable ? (c.precompile.rejectsInvalid ? 'rejected' : 'accepted') : null, ok: c?.reachable ? c.precompile.rejectsInvalid : undefined },
    { label: 'Attested reports', value: reg.data?.reportCount ?? null },
  ];

  return (
    <div className="mx-auto mt-4 max-w-4xl rounded-2xl border border-white/[0.06] bg-ink-900/60 p-1.5 backdrop-blur">
      <div className="flex items-center gap-2 px-4 pb-2 pt-2.5 text-[11px] uppercase tracking-[0.14em] text-fg-dim">
        <span className={`h-1.5 w-1.5 rounded-full ${c ? (c.reachable ? 'bg-pass shadow-[0_0_8px_var(--color-pass)]' : 'bg-fail') : 'animate-pulse bg-fg-dim'}`} />
        Live from the Diana testnet
      </div>
      <dl className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="rounded-xl bg-ink-950/60 px-4 py-3">
            <dt className="text-[11.5px] text-fg-dim">{it.label}</dt>
            <dd className={`mt-1 h-6 text-[15px] font-medium ${it.ok === true ? 'text-pass-soft' : it.ok === false ? 'text-fail-soft' : 'text-fg'}`}>
              {it.value ?? <span className="inline-block h-4 w-20 animate-pulse rounded bg-ink-700/70 align-middle" />}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
