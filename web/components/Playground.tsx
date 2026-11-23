'use client';

import { useState } from 'react';
import { useJson } from '@/lib/client/useJson';
import type { OverviewResponse } from '@/lib/client/types';
import { Callout, Hash, Spinner, Verdict } from './ui';

type Tamper = 'none' | 'message' | 'signature' | 'key' | 'truncate';

interface Result {
  signer: { name: string; version: string; deterministic: boolean; ms: number };
  tamper: Tamper;
  expected: 'accept' | 'reject';
  message: { bytes: number; hex: string };
  publicKey: { bytes: number; keccak256: string };
  signature: { bytes: number; keccak256: string; head: string };
  verdicts: Array<{ id: string; name: string; version: string; available: boolean; reason?: string; valid?: boolean; error?: string; ms?: number;
    evidence?: { blockNumber?: string; calldataHash?: string; to?: string } }>;
}

const TAMPERS: Array<{ id: Tamper; label: string; hint: string }> = [
  { id: 'none', label: 'None', hint: 'Valid signature — every verifier should accept.' },
  { id: 'message', label: 'Flip a message bit', hint: 'The signed message changes by one bit after signing.' },
  { id: 'signature', label: 'Flip a signature bit', hint: 'One bit inside the response vector z (byte 2000) flips.' },
  { id: 'key', label: 'Wrong public key', hint: 'Verify against an unrelated ML-DSA-87 key.' },
  { id: 'truncate', label: 'Truncate signature', hint: 'Drop the last byte (4626 bytes instead of 4627).' },
];

export function Playground({ explorer, defaultTamper = 'none', title = 'Sign your own message' }: { explorer: string; defaultTamper?: Tamper; title?: string }) {
  const [message, setMessage] = useState('Hello, post-quantum world');
  const [encoding, setEncoding] = useState<'utf8' | 'hex'>('utf8');
  const [signer, setSigner] = useState<'noble' | 'openssl'>('noble');
  const [deterministic, setDeterministic] = useState(true);
  const [tamper, setTamper] = useState<Tamper>(defaultTamper);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // This server's real capabilities: OpenSSL can only sign deterministically where its >= 3.5 CLI is installed.
  const overview = useJson<OverviewResponse>('/api/status/overview');
  const canDeterministic = overview.data?.implementations.find((i) => i.id === signer)?.capabilities.deterministicSign ?? true;
  const useDeterministic = deterministic && canDeterministic;

  const go = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/playground', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, encoding, signer, deterministic: useDeterministic, tamper }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      setRes(j);
    } catch (e) {
      setErr((e as Error).message); setRes(null);
    } finally { setBusy(false); }
  };

  return (
    <div className="card card-pad">
      <div className="label">{title}</div>
      <p className="mt-1 text-sm text-fg-muted">A fresh ML-DSA-87 key is generated for each request. The signature goes to all three verifiers, including a live <span className="mono">eth_call</span> to Diana&apos;s precompile.</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="pg-msg" className="text-xs text-fg-dim">Message</label>
            <div className="flex gap-1 text-xs">
              {(['utf8', 'hex'] as const).map((e) => (
                <button key={e} onClick={() => setEncoding(e)} className={`rounded px-2 py-0.5 ${encoding === e ? 'bg-ink-700 text-fg' : 'text-fg-dim hover:text-fg'}`}>{e === 'utf8' ? 'text' : 'hex'}</button>
              ))}
            </div>
          </div>
          <textarea id="pg-msg" className="input mono min-h-[92px] resize-y" value={message} onChange={(e) => setMessage(e.target.value)} spellCheck={false} />
          <div className="flex flex-wrap gap-2 text-xs">
            <button className="text-fg-dim hover:text-fg" onClick={() => { setMessage(''); setEncoding('utf8'); }}>Try the empty message (F-1)</button>
            <span className="text-ink-600">·</span>
            <button className="text-fg-dim hover:text-fg" onClick={() => { setMessage('00'); setEncoding('hex'); }}>Try one zero byte</button>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs text-fg-dim">Signer</div>
            <div className="grid grid-cols-2 gap-1 rounded-lg border border-ink-600 p-1">
              {(['noble', 'openssl'] as const).map((s) => (
                <button key={s} onClick={() => setSigner(s)} className={`rounded-md py-1.5 text-xs ${signer === s ? 'bg-violet-glow/25 text-fg' : 'text-fg-muted hover:bg-ink-800'}`}>{s === 'noble' ? '@noble' : 'OpenSSL'}</button>
              ))}
            </div>
          </div>
          <div>
            <label className={`flex items-center gap-2 text-sm ${canDeterministic ? 'text-fg-muted' : 'text-fg-dim'}`}>
              <input type="checkbox" checked={useDeterministic} disabled={!canDeterministic} onChange={(e) => setDeterministic(e.target.checked)} className="accent-violet-glow" />
              Deterministic signing <span className="text-xs text-fg-dim">(off = hedged)</span>
            </label>
            {!canDeterministic && <div className="mt-1 text-xs text-fg-dim">OpenSSL signs hedged only on this server (deterministic needs its 3.5+ command-line tool).</div>}
          </div>
          <div>
            <label htmlFor="pg-tamper" className="mb-1 block text-xs text-fg-dim">Tamper after signing</label>
            <select id="pg-tamper" className="input" value={tamper} onChange={(e) => setTamper(e.target.value as Tamper)}>
              {TAMPERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <div className="mt-1 text-xs text-fg-dim">{TAMPERS.find((t) => t.id === tamper)?.hint}</div>
          </div>
          <button className="btn-primary w-full" onClick={go} disabled={busy}>{busy ? <><Spinner /> Signing & verifying…</> : 'Sign & verify'}</button>
        </div>
      </div>

      {err && <div className="mt-4"><Callout tone="fail">{err}</Callout></div>}

      {res && (
        <div className="mt-5 space-y-3 border-t border-ink-700 pt-5">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-fg-dim">
            <span>signed by <b className="font-medium text-fg-muted">{res.signer.name} {res.signer.version}</b> ({res.signer.deterministic ? 'deterministic' : 'hedged'}, {res.signer.ms} ms)</span>
            <span>message {res.message.bytes} B</span>
            <span>pk {res.publicKey.bytes} B</span>
            <span>sig {res.signature.bytes} B <Hash value={res.signature.keccak256} head={8} tail={6} /></span>
            <span>expected: <b className="font-medium text-fg-muted">{res.expected}</b></span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {res.verdicts.map((v) => {
              const agrees = v.available && (res.expected === 'accept') === v.valid;
              return (
                <div key={v.id} className={`rounded-lg border p-3.5 ${!v.available ? 'border-ink-700' : agrees ? 'border-pass/30 bg-pass/[0.04]' : 'border-fail/40 bg-fail/[0.06]'}`}>
                  <div className="text-sm font-medium">{v.name}</div>
                  <div className="mono text-fg-dim">{v.version}</div>
                  <div className="mt-3 flex items-center justify-between">
                    {v.available ? <Verdict ok={!!v.valid} tone={agrees ? 'good' : 'bad'} /> : <span className="text-xs text-unsup-soft">unavailable</span>}
                    {v.ms !== undefined && <span className="text-xs tabular-nums text-fg-dim">{v.ms} ms</span>}
                  </div>
                  {v.error && <div className="mt-2 text-xs text-fg-dim">{v.error}</div>}
                  {!v.available && <div className="mt-2 text-xs text-fg-dim">{v.reason}</div>}
                  {v.evidence?.blockNumber && (
                    <div className="mt-2 text-xs text-fg-dim">eth_call @ block <a className="link mono" href={`${explorer}/block/${v.evidence.blockNumber}`} target="_blank" rel="noreferrer">{v.evidence.blockNumber}</a></div>
                  )}
                  {v.available && !agrees && <div className="mt-2 text-xs font-medium text-fail-soft">Disagrees with the expected result</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
