import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { LINKS } from '@/lib/site';

const COLS: Array<{ title: string; links: Array<{ label: string; href: string; external?: boolean }> }> = [
  { title: 'Platform', links: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Test Lab', href: '/test-lab' },
    { label: 'Attack Lab', href: '/attack-lab' },
    { label: 'Reports', href: '/reports' },
    { label: 'On-chain Registry', href: '/registry' },
  ] },
  { title: 'Documentation', links: [
    { label: 'How Rivet works', href: '/docs' },
    { label: 'ECDSA sends, ML-DSA admits', href: '/docs#two-keys' },
    { label: 'The on-chain registry', href: '/docs#registry' },
    { label: 'Security assumptions', href: '/docs#assumptions' },
    { label: 'Findings', href: '/docs#findings' },
  ] },
  { title: 'Resources', links: [
    { label: 'GitHub repository', href: LINKS.github, external: true },
    { label: 'Registry on QoreChain Explorer', href: LINKS.registryExplorer, external: true },
    { label: 'QoreChain documentation', href: LINKS.qorechainDocs, external: true },
    { label: 'Build Before Q-Day', href: LINKS.hackathon, external: true },
  ] },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-ink-950">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="text-[15px] font-semibold tracking-tight">Rivet</span>
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-fg-muted">Make cryptographic integrations hold. Post-quantum interoperability and conformance testing for ML-DSA-87 on QoreChain.</p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <div className="text-[12px] font-medium uppercase tracking-[0.14em] text-fg-dim">{c.title}</div>
            <ul className="mt-4 space-y-2.5">
              {c.links.map((l) => (
                <li key={l.label}>
                  {l.external
                    ? <a href={l.href} target="_blank" rel="noreferrer" className="text-sm text-fg-muted transition-colors hover:text-fg">{l.label} <span aria-hidden className="text-fg-dim">↗</span></a>
                    : <Link href={l.href} className="text-sm text-fg-muted transition-colors hover:text-fg">{l.label}</Link>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-fg-dim sm:px-6 md:flex-row md:items-center md:justify-between">
          <span>© 2026 Rivet contributors · Released under the MIT License</span>
          <span>An independent project built on QoreChain&apos;s Diana testnet for Build Before Q-Day. Not affiliated with QoreChain.</span>
        </div>
      </div>
    </footer>
  );
}
