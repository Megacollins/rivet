'use client';

import { DIANA } from '@rivet/engine/config';
import { Playground } from '@/components/Playground';
import { RunPanel } from '@/components/RunPanel';
import { PageHeader } from '@/components/ui';

const SIG_ATTACKS = [
  ['Message tampering', 'bit flip, appended byte, signature moved to another message'],
  ['Signature tampering', 'bit flips in the challenge c̃, the response z and the hint h'],
  ['Malformed signatures', 'all-zero, truncated, over-long'],
  ['Key attacks', 'wrong key, flipped key bit, truncated key, key and signature swapped'],
  ['Mode confusion', 'non-empty FIPS 204 context; HashML-DSA signature presented as pure ML-DSA'],
  ['Empty inputs', 'empty key, signature and message'],
];

const REPLAY = [
  ['Wrong chain ID', 'signed for EVM chain 9801 (mainnet), submitted on Diana (9800)', 'InvalidSignature'],
  ['Wrong contract', 'signed for a different registry address', 'InvalidSignature'],
  ['Wrong action', 'a revoke authorisation presented as a publish', 'InvalidSignature'],
  ['Payload from another action', 'a signature over a revoke payload used to publish', 'InvalidSignature'],
  ['Result tampering', 'pass/fail counts edited after signing', 'InvalidSignature'],
  ['Spent nonce', 'replay a signature whose nonce was already consumed', 'BadNonce'],
  ['Future nonce', 'pre-signed request with a later nonce', 'BadNonce'],
  ['Expired deadline', 'signature past its deadline', 'Expired'],
];

export default function AttackLab() {
  return (
    <>
      <PageHeader eyebrow="Attack Lab" title="Try to break it">
        Signature-level attacks are thrown at every verifier. Replay and domain-separation attacks are simulated against the
        deployed <span className="mono text-fg">RivetRegistry</span> on Diana with real ML-DSA-87 signatures; the contract&apos;s
        own revert reason is the verdict. An accepted attack is marked <b className="text-fail-soft">critical</b>.
      </PageHeader>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="card card-pad">
          <div className="label">Signature attacks · every verifier</div>
          <ul className="mt-3 space-y-2.5 text-sm">
            {SIG_ATTACKS.map(([t, d]) => (
              <li key={t} className="flex gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-soft" /><span><span className="text-fg">{t}</span> <span className="text-fg-dim">— {d}</span></span></li>
            ))}
          </ul>
        </div>
        <div className="card card-pad">
          <div className="label">Replay & domain separation · RivetRegistry</div>
          <div className="mt-3 space-y-2 text-sm">
            {REPLAY.map(([t, d, e]) => (
              <div key={t} className="flex items-start justify-between gap-3">
                <span><span className="text-fg">{t}</span> <span className="text-fg-dim">— {d}</span></span>
                <span className="mono shrink-0 rounded bg-ink-700/70 px-1.5 py-0.5 text-[11px] text-fail-soft">{e}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <RunPanel
          suites={['attack', 'replay']}
          label="Run all attacks"
          explorer={DIANA.explorer}
          intro={<>Each signature attack also runs a valid control, so a verifier that rejects everything can&apos;t pass. Replay cases need the deployed registry and the attester&apos;s key on this server; otherwise they are reported as skipped.</>}
        />
        <Playground explorer={DIANA.explorer} defaultTamper="signature" title="Craft an attack by hand" />
      </div>
    </>
  );
}
