/**
 * Three independent ML-DSA-87 implementations converge on one verified result.
 * Pure SVG + CSS; particles and flow stop under prefers-reduced-motion.
 */
const SOURCES = [
  { y: 78, name: '@noble/post-quantum', meta: 'TypeScript · signer & verifier' },
  { y: 220, name: 'OpenSSL 3.5', meta: 'C · signer & verifier' },
  { y: 362, name: 'pqcVerify', meta: 'QoreChain precompile · on-chain' },
];
const HUB = { x: 372, y: 220 };
const path = (y: number) => `M 244 ${y} C 300 ${y}, 310 ${HUB.y}, ${HUB.x - 46} ${HUB.y}`;

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[600px]">
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-[32px] bg-[radial-gradient(closest-side,rgb(139_92_246/0.22),transparent)] blur-2xl" />
      <svg viewBox="0 0 600 440" className="h-auto w-full" role="img"
        aria-label="Signatures from @noble/post-quantum, OpenSSL and QoreChain's pqcVerify converge on Rivet and produce one verified result">
        <defs>
          <linearGradient id="hv-line" x1="0" x2="1">
            <stop offset="0" stopColor="#7aa7ff" stopOpacity="0.15" />
            <stop offset="1" stopColor="#a78bfa" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="hv-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a78bfa" />
            <stop offset="1" stopColor="#3b82f6" />
          </linearGradient>
          <radialGradient id="hv-glow">
            <stop offset="0" stopColor="#8b5cf6" stopOpacity="0.55" />
            <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hv-card" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#111a31" />
            <stop offset="1" stopColor="#0b1020" />
          </linearGradient>
        </defs>

        {/* Inbound paths: a static guide plus a flowing dash */}
        {SOURCES.map((s, i) => (
          <g key={s.name}>
            <path d={path(s.y)} fill="none" stroke="#222c4a" strokeWidth="1.5" />
            <path d={path(s.y)} fill="none" stroke="url(#hv-line)" strokeWidth="1.5" className="rv-flow" style={{ animationDelay: `${i * -0.5}s` }} />
            <circle r="3" fill="#c4b5fd" className="rv-motion">
              <animateMotion dur="2.8s" repeatCount="indefinite" begin={`${i * 0.9}s`} path={path(s.y)} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1" />
            </circle>
          </g>
        ))}

        {/* Source chips */}
        {SOURCES.map((s) => (
          <g key={`chip-${s.name}`}>
            <rect x="14" y={s.y - 30} width="230" height="60" rx="14" fill="url(#hv-card)" stroke="#2a3557" />
            <circle cx="38" cy={s.y} r="5" fill="#22c55e" />
            <text x="54" y={s.y - 3} fill="#e7eaf3" fontSize="14" fontWeight="600" fontFamily="var(--font-inter)">{s.name}</text>
            <text x="54" y={s.y + 15} fill="#8891ad" fontSize="11" fontFamily="var(--font-inter)">{s.meta}</text>
          </g>
        ))}

        {/* Hub: the rivet */}
        <circle cx={HUB.x} cy={HUB.y} r="88" fill="url(#hv-glow)" className="rv-pulse" />
        <circle cx={HUB.x} cy={HUB.y} r="46" fill="#0b1020" stroke="url(#hv-ring)" strokeWidth="2" />
        <circle cx={HUB.x} cy={HUB.y} r="30" fill="url(#hv-ring)" opacity="0.95" />
        <circle cx={HUB.x} cy={HUB.y} r="10" fill="#0b1020" />
        <text x={HUB.x} y={HUB.y + 70} textAnchor="middle" fill="#9aa3bd" fontSize="11" letterSpacing="2" fontFamily="var(--font-inter)">CROSS-VERIFY</text>

        {/* Outbound */}
        <path d={`M ${HUB.x + 46} ${HUB.y} L 432 ${HUB.y}`} fill="none" stroke="#a78bfa" strokeWidth="1.5" className="rv-flow" />
        <circle r="3" fill="#86efac" className="rv-motion">
          <animateMotion dur="1.6s" repeatCount="indefinite" path={`M ${HUB.x + 46} ${HUB.y} L 432 ${HUB.y}`} />
        </circle>

        {/* Result card */}
        <g className="rv-float">
          <rect x="432" y="150" width="156" height="140" rx="16" fill="url(#hv-card)" stroke="#2a3557" />
          <rect x="432.5" y="150.5" width="155" height="139" rx="15.5" fill="none" stroke="#22c55e" strokeOpacity="0.25" />
          <circle cx="458" cy="182" r="13" fill="#22c55e" fillOpacity="0.15" />
          <path d="M 452 182 l 4.5 4.5 l 8 -9" fill="none" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="480" y="187" fill="#e7eaf3" fontSize="15" fontWeight="600" fontFamily="var(--font-inter)">Verified</text>
          <text x="450" y="222" fill="#9aa3bd" fontSize="11" fontFamily="var(--font-jetbrains)">ML-DSA-87</text>
          <text x="450" y="242" fill="#9aa3bd" fontSize="11" fontFamily="var(--font-jetbrains)">signer ≠ verifier</text>
          <text x="450" y="268" fill="#a78bfa" fontSize="11" fontFamily="var(--font-jetbrains)">attested on Diana</text>
        </g>
      </svg>
    </div>
  );
}
