'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

const SHOTS = [
  {
    id: 'dashboard', tab: 'Dashboard', src: '/preview/dashboard.png', href: '/dashboard',
    alt: 'Rivet dashboard: live Diana network status, pqcVerify probes, registry attester and implementations under test',
    caption: 'Dashboard: live network status, pqcVerify probes, the registry attester and every implementation under test.',
  },
  {
    id: 'report', tab: 'Report #1', src: '/preview/report.png', href: '/reports/5f696de1-d700-48cd-8998-468cc738c30b',
    alt: 'Rivet report #1: 125 of 136 checks passed, 3 failed, 0 critical; interoperability matrix with failures on the empty-message vector',
    caption: 'Report #1: 136 checks pinned to one Diana block. The red dots in the matrix are finding F-1, the empty-message divergence.',
  },
] as const;

export function ProductPreview() {
  const [active, setActive] = useState<(typeof SHOTS)[number]['id']>('dashboard');
  const shot = SHOTS.find((s) => s.id === active)!;

  return (
    <div>
      <div className="mb-5 flex justify-center">
        <div role="tablist" aria-label="Product screenshots" className="inline-flex rounded-xl border border-white/[0.07] bg-ink-900/70 p-1">
          {SHOTS.map((s) => (
            <button key={s.id} role="tab" aria-selected={active === s.id} aria-controls="preview-panel" onClick={() => setActive(s.id)}
              className={`rounded-lg px-4 py-1.5 text-sm transition-colors ${active === s.id ? 'bg-ink-700 text-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]' : 'text-fg-muted hover:text-fg'}`}>
              {s.tab}
            </button>
          ))}
        </div>
      </div>

      <div id="preview-panel" role="tabpanel" className="relative">
        <div className="pointer-events-none absolute -inset-x-10 -top-10 bottom-10 -z-10 bg-[radial-gradient(60%_60%_at_50%_30%,rgb(139_92_246/0.2),transparent)] blur-2xl" />
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-900 shadow-[0_40px_120px_-40px_rgb(0_0_0/0.9),0_0_0_1px_rgb(139_92_246/0.08)]">
          <div className="flex items-center gap-2 border-b border-white/[0.06] bg-ink-850 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-ink-600" /><span className="h-2.5 w-2.5 rounded-full bg-ink-600" /><span className="h-2.5 w-2.5 rounded-full bg-ink-600" />
            <span className="mono ml-3 truncate text-[11.5px] text-fg-dim">rivet-alpha-rose.vercel.app{shot.href}</span>
          </div>
          <Link href={shot.href} className="group block" aria-label={`Open ${shot.tab}`}>
            <Image key={shot.src} src={shot.src} alt={shot.alt} width={2880} height={1800} sizes="(min-width: 1152px) 1100px, 100vw"
              className="h-auto w-full transition-opacity duration-500 group-hover:opacity-90" priority={shot.id === 'dashboard'} />
          </Link>
        </div>
        <p className="mx-auto mt-4 max-w-2xl text-center text-[13px] text-fg-dim">
          <span className="mr-1.5 rounded border border-white/10 px-1.5 py-0.5 text-[10.5px] uppercase tracking-wider text-fg-muted">Screenshot</span>
          {shot.caption} Captured from the running app; open it to see the live version.
        </p>
      </div>
    </div>
  );
}
