import type { Metadata } from 'next';
import Link from 'next/link';
import { HeroVisual } from '@/components/site/HeroVisual';
import { LiveStrip } from '@/components/site/LiveStrip';
import { ProductPreview } from '@/components/site/ProductPreview';
import { Reveal } from '@/components/site/Reveal';
import { LINKS, REGISTRY } from '@/lib/site';

export const metadata: Metadata = {
  title: { absolute: 'Rivet · Make cryptographic integrations hold' },
  description: 'Rivet tests independent ML-DSA-87 implementations against each other and against QoreChain’s pqcVerify precompile, attacks every signature, and anchors signed, reproducible compatibility reports on-chain.',
};

function SectionHead({ eyebrow, title, children, center }: { eyebrow: string; title: React.ReactNode; children?: React.ReactNode; center?: boolean }) {
  return (
    <Reveal className={`max-w-2xl ${center ? 'mx-auto text-center' : ''}`}>
      <div className="text-[12px] font-medium uppercase tracking-[0.16em] text-violet-soft">{eyebrow}</div>
      <h2 className="mt-3 text-balance text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-fg md:text-[36px]">{title}</h2>
      {children && <p className="mt-4 text-pretty text-[16px] leading-relaxed text-fg-muted">{children}</p>}
    </Reveal>
  );
}

const Code = ({ children }: { children: React.ReactNode }) => <code className="mono rounded bg-white/[0.05] px-1.5 py-0.5 text-[0.86em] text-fg">{children}</code>;

const PLATFORM = [
  { title: 'Test Lab', href: '/test-lab', body: 'Every signer against every verifier, including a live call to pqcVerify.' },
  { title: 'Attack Lab', href: '/attack-lab', body: 'Tampered, malformed and replayed signatures must all be rejected.' },
  { title: 'Reports', href: '/reports', body: 'Reproducible JSON with versions, vectors and evidence for every verdict.' },
  { title: 'Registry', href: '/registry', body: 'Report hashes attested on Diana and verified on-chain with ML-DSA-87.' },
];

const STEPS = [
  { n: '01', title: 'Sign', body: '@noble/post-quantum and OpenSSL 3.5 sign the same vectors from the same seeds.' },
  { n: '02', title: 'Cross-verify', body: 'Every signature goes to every verifier, with pqcVerify pinned to one Diana block.' },
  { n: '03', title: 'Attack', body: 'Bad inputs must be rejected while a valid control is still accepted.' },
  { n: '04', title: 'Attest', body: 'The report hash is signed and published to RivetRegistry, which checks it with pqcVerify.' },
];

export default function Landing() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-280px] -z-10 h-[560px] w-[1000px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(139_92_246/0.16),transparent)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-6 pt-14 sm:px-6 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-8">
          <div>
            <Reveal>
              <div className="text-[13px] text-fg-muted">ML-DSA-87 · live on QoreChain&apos;s Diana testnet</div>
            </Reveal>
            <Reveal delay={60}>
              <h1 className="mt-5 text-balance text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] text-fg sm:text-[56px] lg:text-[64px]">
                Make cryptographic integrations hold.
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-6 max-w-lg text-pretty text-[17px] leading-relaxed text-fg-muted">
                Rivet checks that post-quantum signatures from different libraries, and from QoreChain&apos;s on-chain <Code>pqcVerify</Code>, agree with each other.
              </p>
            </Reveal>
            <Reveal delay={180}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/dashboard" className="btn-primary h-11 px-5 text-[15px]">Explore Rivet <span aria-hidden>→</span></Link>
                <Link href="/docs" className="btn-ghost h-11 px-5 text-[15px]">Read documentation</Link>
              </div>
            </Reveal>
          </div>
          <Reveal delay={150}><HeroVisual /></Reveal>
        </div>
        <div className="px-4 pb-4 sm:px-6"><Reveal><LiveStrip /></Reveal></div>
      </section>

      {/* Platform */}
      <section id="platform" className="scroll-mt-20 px-4 py-24 sm:px-6 md:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHead eyebrow="Platform" title="Test, attack, report, attest." />
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.06] sm:grid-cols-2">
            {PLATFORM.map((p) => (
              <Link key={p.title} href={p.href} className="group bg-ink-950 p-6 transition-colors hover:bg-ink-900 md:p-7">
                <h3 className="flex items-center justify-between text-[17px] font-semibold text-fg">
                  {p.title}
                  <span aria-hidden className="text-fg-dim transition-transform group-hover:translate-x-0.5 group-hover:text-blue-soft">→</span>
                </h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-fg-muted">{p.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Product */}
      <section id="product" className="scroll-mt-20 overflow-x-clip border-t border-white/[0.05] px-4 py-24 sm:px-6 md:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHead center eyebrow="Product" title="Real results, not a mock-up.">
            The first report ran live on Diana: 136 checks, 125 passed, 0 critical. Its 3 failures are finding F-1.
          </SectionHead>
          <Reveal className="mt-12"><ProductPreview /></Reveal>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 border-t border-white/[0.05] px-4 py-24 sm:px-6 md:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHead eyebrow="How it works" title="Two correct libraries can still disagree." />
          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.n} delay={i * 60}>
                <div className="mono text-[12px] text-violet-soft">{s.n}</div>
                <h3 className="mt-2 text-[16px] font-semibold text-fg">{s.title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-fg-muted">{s.body}</p>
              </Reveal>
            ))}
          </ol>
          <Reveal className="mt-12 flex flex-col gap-2 text-[14px] text-fg-muted sm:flex-row sm:gap-8">
            <div><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-pass align-middle" /><span className="text-fg">Tested:</span> @noble/post-quantum, OpenSSL 3.5, pqcVerify</div>
            <div><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-unsup align-middle" /><span className="text-fg">Planned:</span> CIRCL, liboqs, Bouncy Castle (reported as unsupported)</div>
          </Reveal>
          <Reveal className="mt-8">
            <p className="max-w-3xl border-l-2 border-pass/50 pl-4 text-[15px] leading-relaxed text-fg-muted">
              <span className="text-fg">Finding F-1:</span> Rivet caught <Code>pqcVerify</Code> rejecting valid signatures over the empty message. QoreChain fixed it at block 10,654,800, and reports from before and after are both on chain.{' '}
              <Link href="/docs#findings" className="link">Read the finding</Link>
            </p>
          </Reveal>
        </div>
      </section>

      {/* QoreChain */}
      <section id="qorechain" className="scroll-mt-20 border-t border-white/[0.05] px-4 py-24 sm:px-6 md:py-28">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <SectionHead eyebrow="On QoreChain" title="Attestations verified on-chain.">
            RivetRegistry checks each report&apos;s ML-DSA-87 signature through the <Code>pqcVerify</Code> precompile, with domain separation and replay protection.
            Anyone can re-verify it from their own browser.
          </SectionHead>
          <Reveal>
            <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-950">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-2.5">
                <span className="mono text-[11.5px] text-fg-dim">RivetRegistry.sol</span>
                <span className="mono text-[11px] text-fg-dim">{REGISTRY.slice(0, 8)}…{REGISTRY.slice(-6)}</span>
              </div>
              <pre className="mono overflow-x-auto px-5 py-5 text-[12.5px] leading-[1.75] text-fg-muted">{`function `}<span className="text-blue-soft">_pqcVerify</span>{`(bytes memory pubkey, bytes memory signature, bytes memory message) internal view returns (bool) {
    (bool ok, bytes memory ret) =
        PQC_VERIFY.staticcall(abi.encodeCall(IQorePQC.pqcVerify, (pubkey, signature, message)));
    if (!ok || ret.length != 32) revert PrecompileUnavailable(PQC_VERIFY);
    return abi.decode(ret, (bool));
}`}</pre>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/registry?verify=2" className="btn-primary">Verify the latest report</Link>
              <a href={LINKS.registryExplorer} target="_blank" rel="noreferrer" className="btn-ghost">Contract on Explorer ↗</a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/[0.05] px-4 py-24 text-center sm:px-6 md:py-28">
        <Reveal>
          <h2 className="mx-auto max-w-2xl text-balance text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] text-fg md:text-[40px]">Find the disagreement before your users do.</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/test-lab" className="btn-primary h-11 px-5 text-[15px]">Start testing <span aria-hidden>→</span></Link>
            <a href={LINKS.github} target="_blank" rel="noreferrer" className="btn-ghost h-11 px-5 text-[15px]">View on GitHub ↗</a>
          </div>
        </Reveal>
      </section>
    </>
  );
}
