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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="text-[12px] font-medium uppercase tracking-[0.16em] text-violet-soft">{children}</div>;
}

function SectionHead({ eyebrow, title, children, center }: { eyebrow: string; title: React.ReactNode; children?: React.ReactNode; center?: boolean }) {
  return (
    <Reveal className={`max-w-2xl ${center ? 'mx-auto text-center' : ''}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-balance text-[30px] font-semibold leading-[1.15] tracking-[-0.02em] text-fg md:text-[40px]">{title}</h2>
      {children && <p className="mt-4 text-pretty text-[16px] leading-relaxed text-fg-muted">{children}</p>}
    </Reveal>
  );
}

const Code = ({ children }: { children: React.ReactNode }) => <code className="mono rounded bg-white/[0.05] px-1.5 py-0.5 text-[0.86em] text-fg">{children}</code>;

const ICONS = {
  flask: 'M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 006 21h12a1.7 1.7 0 001.5-2.5L14 9V3M7 15h10',
  shield: 'M12 3l8 4v5c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V7l8-4zM9.5 9.5l5 5M14.5 9.5l-5 5',
  file: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  layers: 'M4 7l8-4 8 4-8 4-8-4zM4 12l8 4 8-4M4 17l8 4 8-4',
};
function Icon({ d }: { d: string }) {
  return (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-gradient-to-b from-violet-glow/20 to-blue-glow/5 text-violet-soft">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
    </span>
  );
}

const PLATFORM = [
  { icon: ICONS.flask, title: 'Test Lab', href: '/test-lab',
    body: 'Every signer × every verifier × every vector. Keys derive from the same FIPS 204 seeds, each message is signed hedged and deterministically, and every signature goes to every verifier, including a live eth_call to pqcVerify.',
    points: ['Interoperability matrix', 'Deterministic-signature agreement', 'Sign your own message'] },
  { icon: ICONS.shield, title: 'Attack Lab', href: '/attack-lab',
    body: 'Sixteen signature attacks (tampered c̃, z and h, truncation, wrong keys, context and HashML-DSA confusion) run against every verifier, and eight replay attacks run against the deployed registry contract.',
    points: ['A valid control in every run', 'Accepted attack = critical', 'Contract revert is the verdict'] },
  { icon: ICONS.file, title: 'Compatibility Reports', href: '/reports',
    body: 'Self-contained JSON with implementation versions, test vectors, network and pinned block, and a pass / fail / skipped / unsupported verdict with evidence for every test.',
    points: ['RFC 8785 canonical JSON', 'keccak256 report identity', 'Downloadable and reproducible'] },
  { icon: ICONS.layers, title: 'On-chain Registry', href: '/registry',
    body: 'Report hashes are anchored by RivetRegistry on Diana. Each attestation carries an ML-DSA-87 signature the contract checks through pqcVerify, and anyone can re-verify it from their own browser.',
    points: ['Domain-separated signatures', 'Nonce and deadline replay protection', 'Verify without trusting Rivet'] },
];

const STEPS = [
  { n: '01', title: 'Derive & sign', body: 'Each implementation derives its key from the same 32-byte seed and signs every vector, hedged and deterministic.' },
  { n: '02', title: 'Cross-verify', body: 'Every signature goes to every verifier. On-chain calls are pinned to a single Diana block and recorded as evidence.' },
  { n: '03', title: 'Attack', body: 'Tampered, malformed and replayed inputs must be rejected, and a valid control must still be accepted.' },
  { n: '04', title: 'Attest', body: 'The report’s canonical hash is signed with ML-DSA-87 and published to RivetRegistry, where pqcVerify checks the signature on-chain.' },
];

const TESTED = [
  { name: '@noble/post-quantum', version: '0.7.1', lang: 'TypeScript', role: 'Signer & verifier', note: 'Pure JS, in-process. Hedged and deterministic signing, FIPS 204 contexts.' },
  { name: 'OpenSSL', version: '3.5', lang: 'C', role: 'Signer & verifier', note: 'Through Node’s node:crypto; deterministic signing via the openssl CLI where available.' },
  { name: 'QoreChain pqcVerify', version: 'Diana', lang: 'On-chain precompile', role: 'Verifier', note: 'Live eth_call to 0x…0a01 on the Diana testnet, pinned to a block.' },
];
const PLANNED = [
  { name: 'Cloudflare CIRCL', lang: 'Go', note: 'Needs a Go adapter binary.' },
  { name: 'liboqs', lang: 'C', note: 'Needs a native liboqs build.' },
  { name: 'Bouncy Castle', lang: 'Java', note: 'Needs a JVM adapter.' },
];

export default function Landing() {
  return (
    <>
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.035)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_40%,transparent_100%)]" />
          <div className="absolute left-1/2 top-[-260px] h-[620px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(139_92_246/0.22),rgb(59_130_246/0.08),transparent)]" />
        </div>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-4 pt-12 sm:px-6 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pb-2">
          <div>
            <Reveal>
              <a href="#qorechain" className="group inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] py-1 pl-1 pr-3 text-[12.5px] text-fg-muted transition-colors hover:border-violet-soft/40 hover:text-fg">
                <span className="rounded-full bg-violet-glow/20 px-2 py-0.5 text-[11px] font-medium text-violet-soft">ML-DSA-87</span>
                Live on QoreChain&apos;s Diana testnet
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
              </a>
            </Reveal>
            <Reveal delay={60}>
              <h1 className="mt-6 text-balance text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] text-fg sm:text-[56px] lg:text-[64px]">
                Make cryptographic integrations{' '}
                <span className="bg-gradient-to-r from-violet-soft via-[#b9a8ff] to-blue-soft bg-clip-text text-transparent">hold.</span>
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-6 max-w-xl text-pretty text-[17px] leading-relaxed text-fg-muted">
                Rivet tests independent post-quantum implementations against each other and against QoreChain&apos;s on-chain{' '}
                <Code>pqcVerify</Code> precompile. It attacks every signature, and anchors a signed, reproducible compatibility report on-chain, so you find
                the disagreement before your users do.
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
        <div className="px-4 pb-6 sm:px-6"><Reveal><LiveStrip /></Reveal></div>
      </section>

      {/* ── Problem ────────────────────────────────────────── */}
      <section id="problem" className="scroll-mt-20 px-4 py-24 sm:px-6 md:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHead eyebrow="The problem" title="Two correct libraries can still disagree.">
            Post-quantum signatures are signed in one place and verified in another: a TypeScript wallet, a C server, a Go precompile on-chain. Each can be
            correct on its own terms and still reject the others&apos; output, or accept something it shouldn&apos;t.
          </SectionHead>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {[
              { t: 'Different code paths', d: 'Off-chain signers and on-chain verifiers are separate implementations, written in separate languages and maintained by separate teams.' },
              { t: 'Easy to drift', d: 'Context strings, pre-hash modes (HashML-DSA vs pure ML-DSA), deterministic vs hedged signing and message framing all have to line up exactly.' },
              { t: 'Silent failures', d: 'A verifier that rejects valid signatures locks users out. One that accepts a tampered signature is a vulnerability. Neither shows up until production.' },
            ].map((x, i) => (
              <Reveal key={x.t} delay={i * 80} className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-6">
                <div className="mono text-[12px] text-fg-dim">0{i + 1}</div>
                <h3 className="mt-3 text-[17px] font-semibold text-fg">{x.t}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-fg-muted">{x.d}</p>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-4">
            <div className="flex flex-col gap-4 rounded-2xl border border-unsup/25 bg-gradient-to-r from-unsup/[0.07] to-transparent p-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-3xl">
                <div className="text-[12px] font-medium uppercase tracking-[0.14em] text-unsup-soft">Found by Rivet · Finding F-1</div>
                <p className="mt-2 text-[15px] leading-relaxed text-fg">
                  On Diana, <Code>pqcVerify</Code> returns <Code>false</Code> for valid ML-DSA-87 signatures over the empty message, which @noble/post-quantum and
                  OpenSSL both accept. One-byte messages verify correctly. It&apos;s a false rejection, not a forgery, and exactly the kind of edge case Rivet exists to catch.
                </p>
              </div>
              <Link href="/docs#findings" className="btn-ghost shrink-0">Read the finding</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Platform ───────────────────────────────────────── */}
      <section id="platform" className="scroll-mt-20 border-t border-white/[0.05] px-4 py-24 sm:px-6 md:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHead eyebrow="Platform" title="Test, attack, report, attest.">
            Four tools that turn &ldquo;it works on my machine&rdquo; into evidence anyone can check.
          </SectionHead>
          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {PLATFORM.map((p, i) => (
              <Reveal key={p.title} delay={(i % 2) * 80}>
                <Link href={p.href} className="group relative block h-full overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-900/60 p-7 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-violet-soft/35">
                  <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-violet-glow/0 blur-3xl transition-colors duration-500 group-hover:bg-violet-glow/15" />
                  <Icon d={p.icon} />
                  <h3 className="mt-5 text-[19px] font-semibold text-fg">{p.title}</h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-fg-muted">{p.body}</p>
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {p.points.map((pt) => <li key={pt} className="rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-1 text-[12px] text-fg-muted">{pt}</li>)}
                  </ul>
                  <div className="mt-6 text-sm text-blue-soft">Open {p.title} <span aria-hidden className="inline-block transition-transform group-hover:translate-x-0.5">→</span></div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-20 border-t border-white/[0.05] px-4 py-24 sm:px-6 md:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHead eyebrow="How it works" title="One run, four steps, one verifiable result." />
          <ol className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.06] md:grid-cols-4">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.n} delay={i * 70} className="bg-ink-950 p-6">
                <div className="mono text-[12px] text-violet-soft">{s.n}</div>
                <h3 className="mt-3 text-[16px] font-semibold text-fg">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">{s.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Product preview ────────────────────────────────── */}
      <section id="product" className="scroll-mt-20 overflow-x-clip border-t border-white/[0.05] px-4 py-24 sm:px-6 md:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHead center eyebrow="Product" title="Real results, not a mock-up.">
            Report #1 was produced live on Diana and published on-chain: 136 checks, 125 passed, 3 failed (all finding F-1), 7 unsupported, 1 skipped, and 0 critical.
          </SectionHead>
          <Reveal className="mt-12"><ProductPreview /></Reveal>
        </div>
      </section>

      {/* ── Implementations ────────────────────────────────── */}
      <section id="implementations" className="scroll-mt-20 border-t border-white/[0.05] px-4 py-24 sm:px-6 md:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHead eyebrow="Implementations" title="What's tested today, and what's next.">
            Rivet only reports what it actually ran. Implementations without an adapter appear in every report as <span className="text-unsup-soft">unsupported</span>, never simulated.
          </SectionHead>
          <div className="mt-14 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <Reveal>
              <div className="mb-3 flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] text-pass-soft">
                <span className="h-1.5 w-1.5 rounded-full bg-pass" /> Tested in every run
              </div>
              <div className="space-y-3">
                {TESTED.map((t) => (
                  <div key={t.name} className="flex flex-col gap-1 rounded-2xl border border-white/[0.07] bg-ink-900/60 p-5 sm:flex-row sm:items-center sm:gap-6">
                    <div className="sm:w-56 sm:shrink-0">
                      <div className="text-[15.5px] font-semibold text-fg">{t.name}</div>
                      <div className="mono mt-0.5 text-[12px] text-fg-dim">{t.version} · {t.lang}</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] text-fg">{t.role}</div>
                      <div className="mt-0.5 text-[13.5px] leading-relaxed text-fg-muted">{t.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="mb-3 flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] text-unsup-soft">
                <span className="h-1.5 w-1.5 rounded-full bg-unsup" /> Planned · reported as unsupported
              </div>
              <div className="space-y-3">
                {PLANNED.map((t) => (
                  <div key={t.name} className="rounded-2xl border border-dashed border-white/[0.1] p-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-[15.5px] font-semibold text-fg-muted">{t.name}</div>
                      <div className="mono text-[12px] text-fg-dim">{t.lang}</div>
                    </div>
                    <div className="mt-1 text-[13.5px] text-fg-dim">{t.note}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── QoreChain integration ──────────────────────────── */}
      <section id="qorechain" className="scroll-mt-20 border-t border-white/[0.05] px-4 py-24 sm:px-6 md:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHead eyebrow="QoreChain integration" title="Built on the post-quantum primitives QoreChain actually ships.">
            Everything below has been observed on the Diana testnet, not just read in the docs.
          </SectionHead>
          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            <Reveal className="rounded-2xl border border-white/[0.07] bg-ink-900/60 p-6">
              <div className="mono text-[12px] text-violet-soft">FIPS 204</div>
              <h3 className="mt-3 text-[17px] font-semibold text-fg">ML-DSA-87</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-fg-muted">The highest ML-DSA security category (5). Public keys are 2,592 bytes and signatures 4,627 bytes. QoreChain uses it for account keys and on-chain verification.</p>
            </Reveal>
            <Reveal delay={80} className="rounded-2xl border border-white/[0.07] bg-ink-900/60 p-6">
              <div className="mono text-[12px] text-violet-soft">0x…0a01</div>
              <h3 className="mt-3 text-[17px] font-semibold text-fg">The pqcVerify precompile</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-fg-muted">
                <Code>pqcVerify(pubkey, signature, message)</Code> verifies pure ML-DSA-87 with an empty context over the raw message. On bad input it returns <Code>false</Code> rather than reverting.
              </p>
            </Reveal>
            <Reveal delay={160} className="rounded-2xl border border-white/[0.07] bg-ink-900/60 p-6">
              <div className="mono text-[12px] text-violet-soft">MsgOpenEVMWindow</div>
              <h3 className="mt-3 text-[17px] font-semibold text-fg">Scoped EVM authorization</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-fg-muted">
                EVM transactions are still ECDSA-signed. QoreChain only admits them from an account with a registered ML-DSA-87 key and an open, hybrid-signed window. Rivet publishes inside a window scoped to its registry alone.
              </p>
            </Reveal>
          </div>

          <Reveal className="mt-4">
            <div className="grid overflow-hidden rounded-2xl border border-white/[0.07] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
              <div className="bg-ink-900/60 p-7">
                <h3 className="text-[17px] font-semibold text-fg">How a report gets attested</h3>
                <ol className="mt-4 space-y-3 text-[14.5px] leading-relaxed text-fg-muted">
                  <li><span className="mono mr-2 text-violet-soft">1</span>The report&apos;s RFC 8785 canonical hash and result counts are signed with the attester&apos;s ML-DSA-87 key, under the domain tag <Code>RIVET/ATTEST/v1</Code>, bound to the chain id, the contract, a nonce and a deadline.</li>
                  <li><span className="mono mr-2 text-violet-soft">2</span>Any relayer can submit it. <Code>RivetRegistry</Code> checks the key against the one the attester registered (itself required to be their QoreChain x/pqc key), then verifies the signature with <Code>pqcVerify</Code>.</li>
                  <li><span className="mono mr-2 text-violet-soft">3</span>The event emits the key and signature, so anyone can re-verify it independently, including from the Registry page in their own browser.</li>
                </ol>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/registry?verify=1" className="btn-primary">Verify report #1 in your browser</Link>
                  <a href={LINKS.registryExplorer} target="_blank" rel="noreferrer" className="btn-ghost">Contract on Explorer ↗</a>
                </div>
              </div>
              <div className="border-t border-white/[0.06] bg-ink-950 lg:border-l lg:border-t-0">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-2.5">
                  <span className="mono text-[11.5px] text-fg-dim">contracts/src/RivetRegistry.sol</span>
                  <span className="mono text-[11px] text-fg-dim">{REGISTRY.slice(0, 8)}…{REGISTRY.slice(-6)}</span>
                </div>
                <pre className="mono overflow-x-auto px-5 py-5 text-[12.5px] leading-[1.75] text-fg-muted">{`function `}<span className="text-blue-soft">_pqcVerify</span>{`(bytes memory pubkey, bytes memory signature, bytes memory message) internal view returns (bool) {
    (bool ok, bytes memory ret) =
        PQC_VERIFY.staticcall(abi.encodeCall(IQorePQC.pqcVerify, (pubkey, signature, message)));
    if (!ok || ret.length != 32) revert PrecompileUnavailable(PQC_VERIFY);
    return abi.decode(ret, (bool));
}`}</pre>
                <p className="border-t border-white/[0.06] px-5 py-3 text-[12.5px] text-fg-dim">An inactive precompile answers with empty data, so the contract refuses to treat anything but a 32-byte answer as a result.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────── */}
      <section className="px-4 pb-24 sm:px-6 md:pb-32">
        <Reveal>
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/[0.08] bg-ink-900 px-6 py-16 text-center md:py-20">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_80%_at_50%_0%,rgb(139_92_246/0.25),transparent_70%)]" />
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.03)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_75%)]" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-balance text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] text-fg md:text-[44px]">Find the disagreement before your users do.</h2>
              <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-fg-muted">Run the interop matrix, throw the attack suite at your verifier, and check a published attestation yourself. No account needed.</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/test-lab" className="btn-primary h-11 px-5 text-[15px]">Start testing <span aria-hidden>→</span></Link>
                <a href={LINKS.github} target="_blank" rel="noreferrer" className="btn-ghost h-11 px-5 text-[15px]">View on GitHub ↗</a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
