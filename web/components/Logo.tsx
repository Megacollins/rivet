/** Rivet mark: two plates joined by a rivet. */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="rv-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="10" fill="#0f1629" stroke="url(#rv-g)" strokeOpacity="0.55" />
      <path d="M8 15h24M8 25h24" stroke="#34405f" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="20" r="6.5" fill="url(#rv-g)" />
      <circle cx="20" cy="20" r="2.4" fill="#0b1020" />
    </svg>
  );
}
