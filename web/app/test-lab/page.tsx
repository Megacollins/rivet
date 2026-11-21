'use client';

import { DIANA } from '@rivet/engine/config';
import { InteropMatrix } from '@/components/InteropMatrix';
import { Playground } from '@/components/Playground';
import { RunPanel } from '@/components/RunPanel';
import { PageHeader } from '@/components/ui';

export default function TestLab() {
  return (
    <>
      <PageHeader eyebrow="Test Lab" title="Interoperability & determinism">
        Each implementation derives keys from the same FIPS 204 seeds, signs every test vector both hedged and deterministically,
        and every signature is checked by every verifier, including the live <span className="mono text-fg">pqcVerify</span> precompile
        at a pinned Diana block.
      </PageHeader>
      <div className="space-y-6">
        <Playground explorer={DIANA.explorer} />
        <RunPanel
          suites={['interop', 'determinism']}
          label="Run interop + determinism"
          explorer={DIANA.explorer}
          intro={<>Runs about 75 live checks: 2 signers × 2 modes × 5 vectors × 3 verifiers, plus key-derivation and deterministic-signature agreement. Takes around a minute.</>}
          extra={(report) => <InteropMatrix report={report} />}
        />
      </div>
    </>
  );
}
