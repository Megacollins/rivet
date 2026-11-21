'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Logo } from './Logo';

const NAV = [
  { href: '/', label: 'Dashboard', icon: 'M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10' },
  { href: '/test-lab', label: 'Test Lab', icon: 'M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 006 21h12a1.7 1.7 0 001.5-2.5L14 9V3M7 15h10' },
  { href: '/attack-lab', label: 'Attack Lab', icon: 'M12 3l8 4v5c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V7l8-4zM9.5 9.5l5 5M14.5 9.5l-5 5' },
  { href: '/reports', label: 'Reports', icon: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6' },
  { href: '/registry', label: 'On-chain Registry', icon: 'M4 7l8-4 8 4-8 4-8-4zM4 12l8 4 8-4M4 17l8 4 8-4' },
  { href: '/docs', label: 'Documentation', icon: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19V5M8 7h7' },
];

export function Sidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));

  return (
    <aside className="border-b border-ink-700 bg-ink-900/70 backdrop-blur md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between px-4 py-4 md:px-5 md:py-6">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <Logo />
          <div>
            <div className="text-[15px] font-semibold tracking-tight">Rivet</div>
            <div className="text-[11px] text-fg-dim">Make cryptographic integrations hold</div>
          </div>
        </Link>
        <button className="btn-ghost px-2.5 md:hidden" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen(!open)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </div>
      <nav className={`${open ? 'block' : 'hidden'} px-3 pb-4 md:block`}>
        <ul className="space-y-0.5">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                onClick={() => setOpen(false)}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
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
        <div className="mx-3 mt-6 rounded-lg border border-ink-700 bg-ink-850 p-3 text-[11.5px] leading-relaxed text-fg-dim">
          <div className="mb-1 flex items-center gap-1.5 font-medium text-fg-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-pass shadow-[0_0_8px_var(--color-pass)]" /> Diana testnet
          </div>
          EVM 9800 · ML-DSA-87 · pqcVerify <span className="mono text-[11px]">0x…0a01</span>
        </div>
      </nav>
    </aside>
  );
}
