/**
 * Three independent ML-DSA-87 implementations converge on one verified result.
 * Pure SVG + CSS; particles and flow stop under prefers-reduced-motion.
 * Two layouts: horizontal from sm up, vertical below sm so labels stay readable on small phones.
 */
const SOURCES = [
  { name: '@noble/post-quantum', meta: 'TypeScript · signer & verifier' },
  { name: 'OpenSSL 3.5', meta: 'C · signer & verifier' },
  { name: 'pqcVerify', meta: 'QoreChain precompile · on-chain' },
];
const LABEL = "Signatures from @noble/post-quantum, OpenSSL and QoreChain's pqcVerify converge on Rivet and produce one verified result";

/** Gradients need unique ids per SVG: a gradient inside a display:none SVG doesn't paint elsewhere. */
function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-line`} x1="0" x2="1">
        <stop offset="0" stopColor="#7aa7ff" stopOpacity="0.15" />
        <stop offset="1" stopColor="#a78bfa" stopOpacity="0.9" />
      </linearGradient>
      <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#a78bfa" />
        <stop offset="1" stopColor="#3b82f6" />
      </linearGradient>
      <radialGradient id={`${id}-glow`}>
        <stop offset="0" stopColor="#8b5cf6" stopOpacity="0.55" />
        <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${id}-card`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#111a31" />
        <stop offset="1" stopColor="#0b1020" />
      </linearGradient>
    </defs>
  );
}

function Flow({ id, d, i, dot = '#c4b5fd', dur = 2.8 }: { id: string; d: string; i: number; dot?: string; dur?: number }) {
  return (
    <g>
      <path d={d} fill="none" stroke="#222c4a" strokeWidth="1.5" />
      <path d={d} fill="none" stroke={`url(#${id}-line)`} strokeWidth="1.5" className="rv-flow" style={{ animationDelay: `${i * -0.5}s` }} />
      <circle r="3" fill={dot} className="rv-motion">
        <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${i * 0.9}s`} path={d} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1" />
      </circle>
    </g>
  );
}

function Chip({ id, x, y, w, h, s }: { id: string; x: number; y: number; w: number; h: number; s: (typeof SOURCES)[number] }) {
  return (
    <g>
      <rect x={x} y={y - h / 2} width={w} height={h} rx="14" fill={`url(#${id}-card)`} stroke="#2a3557" />
      <circle cx={x + 24} cy={y} r="5" fill="#22c55e" />
      <text x={x + 40} y={y - 3} fill="#e7eaf3" fontSize="14" fontWeight="600" fontFamily="var(--font-inter)">{s.name}</text>
      <text x={x + 40} y={y + 15} fill="#8891ad" fontSize="11" fontFamily="var(--font-inter)">{s.meta}</text>
    </g>
  );
}

function Hub({ id, x, y }: { id: string; x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="88" fill={`url(#${id}-glow)`} className="rv-pulse" />
      <circle cx={x} cy={y} r="46" fill="#0b1020" stroke={`url(#${id}-ring)`} strokeWidth="2" />
      <circle cx={x} cy={y} r="30" fill={`url(#${id}-ring)`} opacity="0.95" />
      <circle cx={x} cy={y} r="10" fill="#0b1020" />
    </g>
  );
}

function Result({ id, x, y, w, h }: { id: string; x: number; y: number; w: number; h: number }) {
  return (
    <g className="rv-float">
      <rect x={x} y={y} width={w} height={h} rx="16" fill={`url(#${id}-card)`} stroke="#2a3557" />
      <rect x={x + 0.5} y={y + 0.5} width={w - 1} height={h - 1} rx="15.5" fill="none" stroke="#22c55e" strokeOpacity="0.25" />
      <circle cx={x + 26} cy={y + 32} r="13" fill="#22c55e" fillOpacity="0.15" />
      <path d={`M ${x + 20} ${y + 32} l 4.5 4.5 l 8 -9`} fill="none" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <text x={x + 48} y={y + 37} fill="#e7eaf3" fontSize="15" fontWeight="600" fontFamily="var(--font-inter)">Verified</text>
      <text x={x + 18} y={y + 72} fill="#9aa3bd" fontSize="11" fontFamily="var(--font-jetbrains)">ML-DSA-87</text>
      <text x={x + 18} y={y + 92} fill="#9aa3bd" fontSize="11" fontFamily="var(--font-jetbrains)">signer ≠ verifier</text>
      <text x={x + 18} y={y + 118} fill="#a78bfa" fontSize="11" fontFamily="var(--font-jetbrains)">attested on Diana</text>
    </g>
  );
}

/** sm and up: sources left, hub centre, result right. */
function Wide() {
  const id = 'hvw';
  const hub = { x: 372, y: 220 };
  const ys = [78, 220, 362];
  const inbound = (y: number) => `M 244 ${y} C 300 ${y}, 310 ${hub.y}, ${hub.x - 46} ${hub.y}`;
  const out = `M ${hub.x + 46} ${hub.y} L 432 ${hub.y}`;
  return (
    <svg viewBox="0 0 600 440" className="hidden h-auto w-full sm:block" role="img" aria-label={LABEL}>
      <Defs id={id} />
      {ys.map((y, i) => <Flow key={y} id={id} d={inbound(y)} i={i} />)}
      {SOURCES.map((s, i) => <Chip key={s.name} id={id} x={14} y={ys[i]!} w={230} h={60} s={s} />)}
      <Hub id={id} x={hub.x} y={hub.y} />
      <text x={hub.x} y={hub.y + 70} textAnchor="middle" fill="#9aa3bd" fontSize="11" letterSpacing="2" fontFamily="var(--font-inter)">CROSS-VERIFY</text>
      <Flow id={id} d={out} i={0} dot="#86efac" dur={1.6} />
      <Result id={id} x={432} y={150} w={156} h={140} />
    </svg>
  );
}

/** Below sm: sources stacked on top, flowing down through the hub into the result. */
function Tall() {
  const id = 'hvt';
  const hub = { x: 170, y: 300 };
  const ys = [36, 100, 164];
  const inbound = (y: number) => `M 268 ${y} C 318 ${y}, 318 ${hub.y - 90}, ${hub.x} ${hub.y - 46}`;
  const out = `M ${hub.x} ${hub.y + 46} L ${hub.x} 378`;
  return (
    <svg viewBox="0 0 340 520" className="h-auto w-full sm:hidden" role="img" aria-label={LABEL}>
      <Defs id={id} />
      {ys.map((y, i) => <Flow key={y} id={id} d={inbound(y)} i={i} />)}
      {SOURCES.map((s, i) => <Chip key={s.name} id={id} x={8} y={ys[i]!} w={260} h={52} s={s} />)}
      <Hub id={id} x={hub.x} y={hub.y} />
      <text x={hub.x - 62} y={hub.y + 4} textAnchor="end" fill="#9aa3bd" fontSize="10.5" letterSpacing="2" fontFamily="var(--font-inter)">CROSS-VERIFY</text>
      <Flow id={id} d={out} i={0} dot="#86efac" dur={1.6} />
      <Result id={id} x={hub.x - 85} y={378} w={170} h={136} />
    </svg>
  );
}

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[360px] sm:max-w-[600px]">
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-[32px] bg-[radial-gradient(closest-side,rgb(139_92_246/0.22),transparent)] blur-2xl" />
      <Wide />
      <Tall />
    </div>
  );
}
