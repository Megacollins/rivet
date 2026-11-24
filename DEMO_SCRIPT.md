# Rivet demo script (3:00)

**Length:** 2:55, which leaves 5 seconds spare. The voiceover is about 300 words, roughly 2:10 at a calm 140 words a minute, so there are pauses for the screen to do the talking.
**Site:** https://rivetpq.vercel.app, recorded at 1440 px wide with 110% browser zoom.
**Story:** two correct libraries can still disagree with the chain. Rivet catches that, proves it, and puts the proof on-chain. It caught a real bug in QoreChain's `pqcVerify`, and two on-chain reports show the chain before and after the fix.

---

## 1. Pick an opening hook (0:00–0:08)

The first eight seconds decide whether anyone keeps watching. Each option below fits that window, and they're ranked best first.

**A. The bug (recommended)**
> "QoreChain's own post-quantum precompile was rejecting perfectly valid signatures. Rivet caught it, and the proof is on-chain."

*Screen:* report #1's interoperability matrix, zoomed in on the three red dots.

**B. The before and after**
> "These two reports are on-chain. One shows a bug in QoreChain's signature check. The other shows the fix. Here's the tool that caught it."

*Screen:* the Registry page with reports #1 and #2 side by side.

**C. The stakes**
> "Your wallet signs in TypeScript. The chain verifies in Go. If they disagree on even one input, your users get locked out, and nobody notices until production."

*Screen:* the landing-page hero, with the three implementations flowing into the centre.

**D. The question**
> "Two correct post-quantum libraries. One on-chain verifier. Do they actually agree? We ran 136 checks to find out."

*Screen:* report #2's summary bar, all green.

---

## 2. Full script

| Time | Screen | Voiceover | On-screen text |
|---|---|---|---|
| **0:00–0:08** | *Your chosen hook (A by default).* | *Hook line.* | **Rivet** · Make cryptographic integrations hold. |
| **0:08–0:25** | Landing page. Let the hero animation play, then scroll slowly to the Platform cards. | "Rivet is a conformance lab for ML-DSA-87, the post-quantum signature QoreChain uses. Signatures are made in one place and checked in another. Each side can be correct and still disagree. Rivet makes them prove they agree." | ML-DSA-87 · FIPS 204 |
| **0:25–0:50** | **Test Lab** → playground. Type a message, choose **OpenSSL**, click **Sign & verify**. Three green *Accepted* verdicts appear. Then set *Tamper* to **Flip a signature bit** and sign again: three red *Rejected*. | "Here's a signature made with OpenSSL. Three verifiers check it: OpenSSL itself, a second library called @noble/post-quantum, and QoreChain's real `pqcVerify` precompile on the Diana testnet. That's a live call, not a mock. Flip one bit and all three reject it. That's the behaviour we want everywhere." | Live `eth_call` to `0x…0a01` on Diana |
| **0:50–1:05** | Cut to the Interoperability matrix on **report #2** (pre-run, see Prep). Hover over a few dots. | "The full suite does this at scale: every signer, every verifier, both signing modes and five test messages, all pinned to a single block so anyone can reproduce it." | 136 checks · pinned to one Diana block |
| **1:05–1:25** | **Attack Lab** page, then the Attack and Replay sections of report #2. | "Then we attack. Sixteen ways to break a signature, each run beside a valid control, so a verifier that rejects everything can't pass. Plus replay attacks on our own contract: wrong chain, wrong contract, reused nonce. Every one was rejected." | 16 signature attacks · replay attacks on-chain |
| **1:25–1:30** | *Re-hook.* Slow push-in on report #1. | "But the most interesting result was a failure." | |
| **1:30–2:00** | **Report #1** matrix. Zoom to the three red dots on the *empty* vector. Then open **Docs → Findings**. | "In report #1, QoreChain's precompile rejected valid signatures over an empty message. Both libraries accepted them, and the standard allows them. It wasn't a forgery, just a correct signature turned away. We logged it as finding F-1, with a reproduction anyone can run." | Finding F-1 · false rejection, not a forgery |
| **2:00–2:15** | **Report #2.** Summary bar, all green. Then the F-1 note on the Dashboard. | "Then, on November 24th, at block 10,654,800, the chain started accepting them. Report #2 shows zero failures. Both reports are on-chain: before, and after." | Fixed at block 10,654,800 · 129 passed, 0 failed |
| **2:15–2:45** | **Registry** → `?verify=2`. Let the in-browser verification steps tick green one by one. Then open the publish transaction on the explorer. | "How do you know you can trust Rivet's reports? You don't have to. Each one is signed with ML-DSA-87 and published to our registry contract, which checks the signature with `pqcVerify` inside the transaction. And your browser can re-check everything itself, straight from the chain." | Verified in your browser · no server trusted |
| **2:45–2:55** | Back to the landing page, then end card with both links. | "Rivet. Find the disagreement before your users do." | **rivetpq.vercel.app** · github.com/Megacollins/rivet |

---

## 3. Re-hooks to keep attention

Lines that pull the viewer into the next section. One is already in the script at 1:25; swap in others if a section feels slow.

- Before the Attack Lab: *"Accepting good signatures is half the job. Rejecting bad ones is the other half."*
- Before the finding (in use): *"But the most interesting result was a failure."*
- Before the Registry: *"So why trust a report Rivet wrote about itself? You don't have to."*

---

## 4. Before you record

1. **Run the suites first.** A full Test Lab run takes about a minute, so record the matrix from report #2 rather than waiting on camera. If you'd rather show a run, start it and cut the wait.
2. **Show replay from report #2.** The public site has no operator keys, so it skips replay. Report #2 has all 10 replay results from a real run.
3. **Keep these tabs open, in order:**
   - `/`
   - `/test-lab`
   - `/reports/d9609615-3f96-4f8c-956e-e24b48686346` (report #2)
   - `/attack-lab`
   - `/reports/5f696de1-d700-48cd-8998-468cc738c30b` (report #1)
   - `/docs#findings`
   - `/dashboard`
   - `/registry?verify=2`
4. **Do a test run of the in-browser verification.** It reads the chain live; on a slow connection, re-record or trim the wait.
5. **Explorer link** for the publish transaction of report #2:
   https://explore.qore.network/tx/0x3dd4bc8becdd0e1b377173474490d1a7e03a2b7b0206f4d639564d742431ebf9
6. **Hide everything else:** bookmarks bar, notifications and other tabs.

---

## 5. Keep it accurate

The judges can check every claim, so stick to what Rivet has shown.

**Fine to say**
- It runs on the **Diana testnet**.
- "Rivet caught it", and "the chain started accepting them at block 10,654,800".

**Don't say**
- "mainnet";
- that Rivet's report caused the fix. We only know when the behaviour changed, not why;
- that CIRCL, liboqs or Bouncy Castle are tested. They're listed as planned and reported as unsupported.

---

## 6. Facts used, and where they come from

| Claim | Source |
|---|---|
| 136 checks; 129 passed, 0 failed (report #2) | `reports/examples/d9609615-…json`; on-chain report #2 |
| 125 passed, 3 failed on the empty message (report #1) | `reports/examples/5f696de1-…json`; on-chain report #1 |
| F-1 fixed at block 10,654,800, 2026-11-24 07:32 UTC | `docs/FINDINGS.md`, `engine/test/live.test.ts`, `engine/scripts/empty-msg-repro.ts` |
| 16 signature attacks with a valid control; replay 10/10 | Attack Lab page; report #2; `DEPLOYMENTS.md` |
| `pqcVerify` called inside the publish transaction | `contracts/src/RivetRegistry.sol` (`_pqcVerify`) |
| Report #2 publish tx and block | `DEPLOYMENTS.md` |
