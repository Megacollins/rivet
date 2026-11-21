'use client';

import type { Report } from '@rivet/engine/report';
import type { TestResult } from '@rivet/engine/types';

const DOT: Record<TestResult['status'], string> = {
  pass: 'bg-pass shadow-[0_0_6px_rgb(34_197_94/0.6)]',
  fail: 'bg-fail shadow-[0_0_6px_rgb(239_68_68/0.7)]',
  unsupported: 'bg-unsup/80',
  skipped: 'bg-skip/50',
};

/** Signer (and signing mode) × verifier; each cell shows one dot per test vector. */
export function InteropMatrix({ report }: { report: Report }) {
  const rows = report.results.filter((r) => r.suite === 'interop' && r.signer && r.vector);
  if (rows.length === 0) return null;
  const name = (id: string) => report.implementations.find((i) => i.id === id)?.name ?? id;
  const signerKeys = [...new Set(rows.map((r) => `${r.signer}.${r.id.split('.')[2]}`))];
  const verifiers = [...new Set(rows.map((r) => r.verifier))];
  const vectors = report.vectors.map((v) => v.id);
  const cell = (sk: string, v: string) => vectors.map((vec) => rows.find((r) => `${r.signer}.${r.id.split('.')[2]}` === sk && r.verifier === v && r.vector === vec));

  return (
    <div className="card card-pad">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <div className="label">Interoperability matrix</div>
        <div className="flex flex-wrap gap-3 text-[11px] text-fg-dim">
          {(['pass', 'fail', 'unsupported', 'skipped'] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${DOT[s]}`} />{s}</span>
          ))}
        </div>
      </div>
      <p className="mb-4 text-sm text-fg-muted">Rows sign, columns verify. Each dot is one vector: {vectors.join(', ')}.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-1.5 text-sm">
          <thead>
            <tr>
              <th className="label w-56 text-left font-medium">Signer ↓ / Verifier →</th>
              {verifiers.map((v) => <th key={v} className="text-left text-xs font-medium text-fg-muted">{name(v)}</th>)}
            </tr>
          </thead>
          <tbody>
            {signerKeys.map((sk) => {
              const [signer, mode] = sk.split('.');
              return (
                <tr key={sk}>
                  <td className="pr-2 text-fg"><div>{name(signer!)}</div><div className="text-xs text-fg-dim">{mode}</div></td>
                  {verifiers.map((v) => (
                    <td key={v} className="rounded-lg border border-ink-700 bg-ink-850 px-3 py-2.5">
                      <div className="flex gap-1.5">
                        {cell(sk, v).map((r, i) => (
                          <span key={i} title={r ? `${vectors[i]}: ${r.status}${r.detail ? ` — ${r.detail}` : ''}` : `${vectors[i]}: not run`}
                            className={`h-2.5 w-2.5 rounded-full ${r ? DOT[r.status] : 'bg-ink-600'}`} />
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
