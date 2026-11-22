'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { LINKS } from '@/lib/site';

const NAV = [
  { href: '/#platform', label: 'Platform' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/docs', label: 'Documentation' },
  { href: LINKS.github, label: 'GitHub', external: true },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={`sticky top-0 z-50 transition-colors duration-300 ${scrolled || open ? 'border-b border-white/[0.06] bg-ink-950/75 backdrop-blur-xl' : 'border-b border-transparent'}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Rivet home" onClick={() => setOpen(false)}>
          <Logo size={30} />
          <span className="text-[15px] font-semibold tracking-tight">Rivet</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((n) => (
            <a key={n.label} href={n.href} {...(n.external ? { target: '_blank', rel: 'noreferrer' } : {})}
              className="rounded-md px-3 py-2 text-sm text-fg-muted transition-colors hover:text-fg">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="btn-primary hidden h-9 px-4 sm:inline-flex">Open Rivet</Link>
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-600 text-fg-muted md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen(!open)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Overlay below the header, so opening/closing never shifts the page (anchor jumps land exactly). */}
      <div id="site-menu" className={`absolute inset-x-0 top-full overflow-hidden transition-[max-height,opacity] duration-300 md:hidden ${open ? 'max-h-96 opacity-100' : 'pointer-events-none max-h-0 opacity-0'}`}>
        <nav className="space-y-1 border-y border-white/[0.06] bg-ink-950 px-4 pb-5 pt-3 shadow-[0_24px_48px_-12px_rgb(0_0_0/0.8)] backdrop-blur-xl" aria-label="Mobile">
          {NAV.map((n) => (
            <a key={n.label} href={n.href} onClick={() => setOpen(false)} {...(n.external ? { target: '_blank', rel: 'noreferrer' } : {})}
              className="block rounded-lg px-3 py-2.5 text-[15px] text-fg-muted hover:bg-ink-800 hover:text-fg">
              {n.label}
            </a>
          ))}
          <Link href="/dashboard" onClick={() => setOpen(false)} className="btn-primary mt-2 w-full">Open Rivet</Link>
        </nav>
      </div>
    </header>
  );
}
