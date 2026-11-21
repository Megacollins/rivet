'use client';

import { useState } from 'react';
import type { Status } from '@rivet/engine/types';

const STATUS: Record<Status, { label: string; cls: string; dot: string }> = {
  pass: { label: 'Pass', cls: 'border-pass/30 bg-pass/10 text-pass-soft', dot: 'bg-pass' },
  fail: { label: 'Fail', cls: 'border-fail/35 bg-fail/10 text-fail-soft', dot: 'bg-fail' },
  skipped: { label: 'Skipped', cls: 'border-skip/25 bg-skip/10 text-skip', dot: 'bg-skip' },
  unsupported: { label: 'Unsupported', cls: 'border-unsup/30 bg-unsup/10 text-unsup-soft', dot: 'bg-unsup' },
};

export function StatusBadge({ status, critical, label }: { status: Status; critical?: boolean; label?: string }) {
  const s = STATUS[status];
  if (label) return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{label}
    </span>
  );
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {critical && status === 'fail' ? 'CRITICAL' : s.label}
    </span>
  );
}

export function Verdict({ ok, yes = 'Accepted', no = 'Rejected', tone }: { ok: boolean; yes?: string; no?: string; tone?: 'good' | 'bad' }) {
  const good = tone ? tone === 'good' : ok;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${good ? 'bg-pass/12 text-pass-soft' : 'bg-fail/12 text-fail-soft'}`}>
      {ok ? '✓' : '✕'} {ok ? yes : no}
    </span>
  );
}

export function PageHeader({ eyebrow, title, children, actions }: { eyebrow?: React.ReactNode; title: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <div className="label mb-2 text-violet-soft">{eyebrow}</div>}
        <h1 className="text-[26px] font-semibold tracking-tight md:text-[30px]">{title}</h1>
        {children && <div className="mt-2 text-[14.5px] leading-relaxed text-fg-muted">{children}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Hash({ value, head = 10, tail = 8, href }: { value: string; head?: number; tail?: number; href?: string }) {
  const [copied, setCopied] = useState(false);
  const short = value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* clipboard blocked */ }
  };
  return (
    <span className="inline-flex items-center gap-1.5 mono text-fg-muted" title={value}>
      {href ? <a className="link" href={href} target="_blank" rel="noreferrer">{short}</a> : short}
      <button onClick={copy} className="text-fg-dim hover:text-fg" aria-label="Copy">
        {copied ? '✓' : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></svg>
        )}
      </button>
    </span>
  );
}

export function Stat({ label, value, tone, sub }: { label: string; value: React.ReactNode; tone?: 'pass' | 'fail' | 'violet' | 'unsup' | 'skip'; sub?: React.ReactNode }) {
  const color = { pass: 'text-pass-soft', fail: 'text-fail-soft', violet: 'text-violet-soft', unsup: 'text-unsup-soft', skip: 'text-skip' }[tone ?? 'violet'];
  return (
    <div className="card card-pad">
      <div className="label">{label}</div>
      <div className={`mt-2 text-[28px] font-semibold tabular-nums leading-none ${tone ? color : 'text-fg'}`}>{value}</div>
      {sub && <div className="mt-2 text-xs text-fg-dim">{sub}</div>}
    </div>
  );
}

export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" fill="none" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Callout({ tone = 'info', title, children }: { tone?: 'info' | 'warn' | 'fail' | 'pass'; title?: string; children: React.ReactNode }) {
  const cls = {
    info: 'border-blue-glow/30 bg-blue-glow/[0.06]',
    warn: 'border-unsup/30 bg-unsup/[0.06]',
    fail: 'border-fail/30 bg-fail/[0.06]',
    pass: 'border-pass/30 bg-pass/[0.06]',
  }[tone];
  return (
    <div className={`rounded-xl border px-4 py-3 text-[13.5px] leading-relaxed text-fg-muted ${cls}`}>
      {title && <div className="mb-1 font-medium text-fg">{title}</div>}
      {children}
    </div>
  );
}

export function SummaryBar({ s }: { s: { passed: number; failed: number; skipped: number; unsupported: number; total: number } }) {
  const seg = (n: number, cls: string, label: string) =>
    n > 0 ? <div className={cls} style={{ width: `${(n / Math.max(s.total, 1)) * 100}%` }} title={`${n} ${label}`} /> : null;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-ink-700">
      {seg(s.passed, 'bg-pass', 'passed')}
      {seg(s.failed, 'bg-fail', 'failed')}
      {seg(s.unsupported, 'bg-unsup', 'unsupported')}
      {seg(s.skipped, 'bg-skip', 'skipped')}
    </div>
  );
}
