import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'Documentation' };

const TOC = [
  ['what', 'What Rivet tests'],
  ['two-keys', 'ECDSA sends, ML-DSA admits'],
  ['registry', 'The on-chain registry'],
  ['reports', 'Reports & reproducibility'],
  ['cli', 'Run it yourself'],
  ['assumptions', 'Security assumptions'],
  ['findings', 'Findings'],
  ['limits', 'Limitations'],
];

function H({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="scroll-mt-6 pt-2 text-xl font-semibold tracking-tight">{children}</h2>;
}
function Code({ children }: { children: string }) {
  return <pre className="mono overflow-x-auto rounded-lg border border-ink-700 bg-ink-950/80 px-4 py-3 leading-relaxed text-fg-muted">{children}</pre>;
}
const C = ({ children }: { children: React.ReactNode }) => <code className="mono rounded bg-ink-800 px-1 py-0.5 text-[12px] text-fg">{children}</code>;

export default function Docs() {
  return (
    <>
      <PageHeader eyebrow="Documentation" title="How Rivet works">
        What is tested, how the on-chain registry authorises reports, and what Rivet assumes. Everything here describes behaviour
        that has been observed on Diana, not only what the docs say.
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
        <nav className="hidden lg:block">
          <ul className="sticky top-8 space-y-1 text-sm">
            {TOC.map(([id, t]) => <li key={id}><a className="block rounded px-2 py-1 text-fg-muted hover:bg-ink-800 hover:text-fg" href={`#${id}`}>{t}</a></li>)}
          </ul>
        </nav>

        <article className="min-w-0 space-y-5 text-[14.5px] leading-relaxed text-fg-muted [&_b]:font-medium [&_b]:text-fg">
          <H id="what">What Rivet tests</H>
          <p>
            QoreChain exposes ML-DSA-87 (FIPS 204, security category 5) to Solidity through the <C>pqcVerify</C> precompile at{' '}
            <C>0x…0a01</C>. Any dApp that signs off-chain and verifies on-chain depends on two different implementations agreeing
            byte for byte. Rivet checks that they do.
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li><b>Interop.</b> @noble/post-quantum and OpenSSL 3.5 each derive keys from the same seeds and sign five vectors, hedged and deterministic. Every signature is checked by both libraries and by the live precompile.</li>
            <li><b>Determinism.</b> Both libraries must derive identical keys from a seed and identical deterministic signatures; hedged signatures must differ.</li>
            <li><b>Attacks.</b> 16 tampering and malformed-input attacks plus a valid control, checked by every verifier. An accepted attack is critical.</li>
            <li><b>Replay.</b> Signatures bound to the wrong chain, contract, action, nonce or deadline are submitted to the deployed registry and must revert.</li>
          </ul>
          <p>The precompile signature is <C>pqcVerify(bytes pubkey, bytes signature, bytes message) returns (bool)</C>. It verifies pure ML-DSA-87 with an empty context over the raw message, and returns false rather than reverting on bad input.</p>

          <H id="two-keys">ECDSA sends, ML-DSA admits</H>
          <p>
            On QoreChain an EVM transaction is still signed with <b>classical ECDSA (secp256k1)</b>. The chain will only <b>admit</b> it
            when the sending account has (1) a registered ML-DSA-87 key and (2) an open <b>EVM authorisation window</b>. Both are
            native-lane messages:
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ['1 · Register the key', 'MsgRegisterPQCKeyV2 carries the ML-DSA-87 public key and a proof of possession. It must be the account’s first transaction and is the only one that may be signed with ECDSA alone.'],
              ['2 · Open a window', 'MsgOpenEVMWindow is hybrid-signed (ECDSA + ML-DSA-87). It sets a block range, a transaction count and a spend cap, and can be scoped to specific contracts.'],
              ['3 · Send EVM txs', 'Ordinary ECDSA-signed EVM transactions are admitted while the window lasts. A scoped window refuses contract creation and any other target.'],
            ].map(([t, d]) => (
              <div key={t} className="rounded-lg border border-ink-700 bg-ink-900/70 p-4">
                <div className="text-sm font-medium text-fg">{t}</div>
                <p className="mt-1.5 text-[13px]">{d}</p>
              </div>
            ))}
          </div>
          <p>
            Rivet&apos;s operator deployed the registry inside an unscoped window, because creation requires one, and publishes every
            report inside a window scoped to the registry alone. The report attestation itself is a <b>separate</b> ML-DSA-87 signature,
            verified by the contract through <C>pqcVerify</C>. Even a stolen ECDSA key cannot publish without it.
          </p>

          <H id="registry">The on-chain registry</H>
          <p><C>RivetRegistry</C> stores <C>reportHash</C>, the four result counts, and the attester. Every state change is authorised by an ML-DSA-87 signature over:</p>
          <Code>{`"RIVET/ATTEST/v1" ‖ abi.encode(
  uint8   action,        // 1 publish · 2 revoke · 3 deactivate
  uint256 block.chainid, // 9800 on Diana
  address registry,      // this contract
  address attester,
  uint64  nonce,         // must equal the attester's next nonce
  uint64  deadline,      // block.timestamp <= deadline
  bytes32 payload)       // publish: keccak(reportHash, summary, keccak(uri))`}</Code>
          <ul className="list-disc space-y-1.5 pl-5">
            <li><b>Attester key = chain key.</b> <C>registerAttester</C> accepts only the exact key that <C>pqcKeyStatus</C> reports for the caller, with possession proven. A deactivated key can never be revived.</li>
            <li><b>Relayable.</b> Anyone can submit a signed request; the ECDSA sender is irrelevant to authorisation.</li>
            <li><b>Domain separation.</b> The ASCII tag can&apos;t be mistaken for a QoreChain transaction frame: read as a big-endian length, &quot;RIVE&quot; is 0x52495645 bytes. The tag also differs from the v2 hybrid and proof-of-possession prefixes.</li>
            <li><b>Independent verification.</b> <C>ReportPublished</C> emits the public key and the signature, and <C>verifyAttestation()</C> re-runs the check. The Registry page does all of this from your browser.</li>
          </ul>

          <H id="reports">Reports & reproducibility</H>
          <p>
            A report (<C>rivet.report/v1</C>) records the engine and Node versions, each implementation&apos;s version and capabilities, the exact
            seeds and messages, the network and the <b>block every on-chain call was pinned to</b>, and per test: expected, actual, status, evidence
            (RPC, block, <C>keccak256(calldata)</C>). Its identity is <C>keccak256(JCS(report))</C> under RFC 8785 canonical JSON.
          </p>

          <H id="cli">Run it yourself</H>
          <Code>{`npm install
node engine/src/cli.ts run                 # all suites, live on Diana → reports/<id>.json
node engine/src/cli.ts run --offline       # local implementations only
node engine/src/cli.ts verify 1 --file reports/<id>.json
cd contracts && forge test                 # 35 tests; pqcVerify served by real ML-DSA via FFI`}</Code>

          <H id="assumptions">Security assumptions</H>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>The ML-DSA-87 attester key (seed) and the ECDSA operator key are held only in server environment variables. Neither is ever returned by an API or shown in the UI.</li>
            <li>The web app publishes only when <C>RIVET_WEB_OPERATOR=1</C> and the keys are configured. Hosted deployments are read-only.</li>
            <li>The registry trusts QoreChain&apos;s <C>pqcVerify</C> and <C>pqcKeyStatus</C> precompiles. If a precompile is unavailable, the contract reverts with <C>PrecompileUnavailable</C> instead of assuming success.</li>
            <li>A report hash proves integrity and authorship, not correctness: anyone can re-run the suites and compare results.</li>
            <li>The Foundry tests replace the precompile with an FFI bridge to a real ML-DSA verifier, not a stub, so contract tests exercise real signatures.</li>
          </ul>

          <H id="findings">Findings</H>
          <div className="rounded-xl border border-pass/30 bg-pass/[0.05] p-4">
            <div className="font-medium text-fg">F-1 · pqcVerify rejected valid signatures over the empty message <span className="text-pass-soft">· fixed</span></div>
            <p className="mt-1.5 text-[13.5px]">
              Up to block 10,654,799 on Diana (chain v3.2.8), the precompile returned <C>false</C> for valid ML-DSA-87 signatures over a 0-byte
              message, hedged or deterministic, from either library. @noble/post-quantum and OpenSSL both accept them, and FIPS 204 allows empty
              messages. Messages of one byte or more always verified. It was a false rejection with no security impact.
            </p>
            <p className="mt-2 text-[13.5px]">
              From block 10,654,800 (2026-11-24) the precompile accepts them. Reports #1 and #2 on registry v1 record the failure and the fix, both
              attested on chain. A live regression test checks both sides of that block. Rivet&apos;s own signed messages are always 239 bytes, so it was never affected.
            </p>
          </div>

          <H id="limits">Limitations</H>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>CIRCL (Go), liboqs (C) and Bouncy Castle (Java) are listed but reported as <b>unsupported</b>: no toolchain or binding is installed on this server.</li>
            <li>OpenSSL deterministic signing uses the <C>openssl</C> CLI, because Node exposes no deterministic mode. The CLI cannot sign a 0-byte input, and that cell is reported as unsupported.</li>
            <li><C>pqcVerify</C> is active on the Diana testnet only. Publishing a report costs about 508k gas, most of it the on-chain ML-DSA-87 verification of a 4,627-byte signature.</li>
          </ul>
        </article>
      </div>
    </>
  );
}
