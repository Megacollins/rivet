'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from './Logo';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: 'M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10' },
  { href: '/test-lab', label: 'Test Lab', icon: 'M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 006 21h12a1.7 1.7 0 001.5-2.5L14 9V3M7 15h10' },
  { href: '/attack-lab', label: 'Attack Lab', icon: 'M12 3l8 4v5c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V7l8-4zM9.5 9.5l5 5M14.5 9.5l-5 5' },
  { href: '/reports', label: 'Reports', icon: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6' },
  { href: '/registry', label: 'On-chain Registry', icon: 'M4 7l8-4 8 4-8 4-8-4zM4 12l8 4 8-4M4 17l8 4 8-4' },
  { href: '/docs', label: 'Documentation', icon: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19V5M8 7h7' },
];

/**
 * App navigation. From lg (1024px) up: a fixed-width sidebar. Below that: a sticky top bar showing the
 * current section, with the full menu as an overlay (it never pushes page content down).
 */
export function Sidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => path.startsWith(href);
  const current = NAV.find((n) => active(n.href));

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const links = (
    <ul className="space-y-0.5">
      {NAV.map((n) => (
        <li key={n.href}>
          <Link
            href={n.href}
            onClick={() => setOpen(false)}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition lg:py-2 ${
              active(n.href) ? 'bg-gradient-to-r from-violet-glow/20 to-blue-glow/5 text-fg shadow-[inset_2px_0_0_var(--color-violet-soft)]' : 'text-fg-muted hover:bg-ink-800 hover:text-fg'
            }`}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
              className={active(n.href) ? 'text-violet-soft' : 'text-fg-dim group-hover:text-fg-muted'}>
              <path d={n.icon} />
            </svg>
            {n.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  const network = (
    <div className="rounded-lg border border-ink-700 bg-ink-850 p-3 text-[11.5px] leading-relaxed text-fg-dim">
      <div className="mb-1 flex items-center gap-1.5 font-medium text-fg-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-pass shadow-[0_0_8px_var(--color-pass)]" /> Diana testnet
      </div>
      EVM 9800 · ML-DSA-87 · pqcVerify <span className="mono text-[11px]">0x…0a01</span>
    </div>
  );

  return (
    <>
      {/* Below lg: sticky top bar */}
      <header className="sticky top-0 z-40 border-b border-ink-700 bg-ink-950/85 backdrop-blur-xl lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="Rivet home">
            <Logo size={28} />
            <span className="text-[15px] font-semibold tracking-tight">Rivet</span>
            {current && <span className="truncate text-sm text-fg-dim"><span className="mx-1.5 text-ink-500">/</span>{current.label}</span>}
          </Link>
          <button className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink-600 text-fg-muted"
            aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="app-menu" onClick={() => setOpen(!open)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
        <div id="app-menu" className={`absolute inset-x-0 top-full overflow-hidden transition-[max-height,opacity] duration-300 ${open ? 'max-h-[34rem] opacity-100' : 'pointer-events-none max-h-0 opacity-0'}`}>
          <nav aria-label="App" className="space-y-4 border-b border-ink-700 bg-ink-950 px-3 pb-4 pt-2 shadow-[0_24px_48px_-12px_rgb(0_0_0/0.8)] sm:px-5">
            {links}
            <div className="px-1">{network}</div>
          </nav>
        </div>
      </header>

      {/* lg and up: sidebar */}
      <aside className="hidden border-r border-ink-700 bg-ink-900/70 backdrop-blur lg:sticky lg:top-0 lg:block lg:h-screen lg:w-64 lg:shrink-0 lg:overflow-y-auto">
        <div className="px-5 py-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Rivet home">
            <Logo />
            <div>
              <div className="text-[15px] font-semibold tracking-tight">Rivet</div>
              <div className="text-[11px] text-fg-dim">Make cryptographic integrations hold</div>
            </div>
          </Link>
        </div>
        <nav aria-label="App" className="px-3 pb-4">
          {links}
          <div className="mx-3 mt-6">{network}</div>
        </nav>
      </aside>
    </>
  );
}
