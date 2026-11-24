# QCAI audit

Rivet's on-chain contract, `RivetRegistry`, was audited with QoreChain's AI Smart Contract Auditor at https://dashboard.qorechain.io/audit in two stages. Both stages use the same setting so the reports can be compared:

- **Blockchain:** Ethereum (EVM/Solidity)
- **Name:** `RivetRegistry`
- **Source:** `contracts/src/RivetRegistry.sol` and its interface, flattened into one file with `forge flatten`, because the auditor takes a single pasted source. Both stages audited [`audit/RivetRegistry.v1.flat.sol`](audit/RivetRegistry.v1.flat.sol). The fixed contract is [`audit/RivetRegistry.v2.flat.sol`](audit/RivetRegistry.v2.flat.sol).

| Stage | Date | Report | Result |
|---|---|---|---|
| 1 | 2026-11-24 | [`audit/stage1-2026-11-24.pdf`](audit/stage1-2026-11-24.pdf) | Score 85/100, 4 findings (1 high, 2 medium, 1 low). Quantum readiness "not scored for this setting". |
| 2 | 2026-11-24 | [`audit/stage2-2026-11-24.pdf`](audit/stage2-2026-11-24.pdf) | Score 85/100. None of the 4 stage 1 findings came back. 3 new findings (1 medium, 1 low, 1 info). The medium one was real and is **fixed in v2**. |

Stage 1 led to no contract changes, so both stages audited the same code: v1, deployed at `0x2afd0bfb2cae5b1f3d0a96265f7b314cb514205c`. Stage 2's medium finding was real. The contract was fixed and **redeployed as v2** at `0xbff74b159e7b5988c8a0030c817363074322acd4`, and v2's on-chain bytecode matches the build of the fixed source. The v1 → v2 diff is only that fix: one mapping, one check and one write. See [DEPLOYMENTS.md](../DEPLOYMENTS.md).

> The reports' line numbers match neither the pasted file nor the source file, so each finding below is matched to the code by what it describes.

## Stage 1 findings and responses

Each finding is either fixed, covered by a named regression test, or explained as a false positive. All tests are in [`contracts/test/RivetRegistry.t.sol`](../contracts/test/RivetRegistry.t.sol), and all 35 pass (`forge test`).

### QCAI-1 · HIGH · Missing access control on critical functions (`registerAttester`)

**Response: by design, not a vulnerability. Covered by regression tests.**

Open registration is the point of the registry: any QoreChain account with a post-quantum key can attest to reports, and readers choose which attester addresses to trust. What has to be controlled is *whose key* an address can register, and that is strictly limited:

- The caller can only register **as itself** (`msg.sender`). There's no parameter for another address.
- The key must be the caller's own QoreChain x/pqc key, read from the `pqcKeyStatus` precompile. It must be registered, be ML-DSA-87 (algorithm 1), have **proof of possession**, and match the submitted key byte for byte.
- A key that was deactivated can't be registered again.
- Registering touches only the caller's own record. It can't change, revive or sign for another attester.

An allow-list owner would add a central party and an admin key to compromise, which conflicts with the goal of "verify without trusting Rivet". Rivet's own app shows which attester signed each report. The registry trusts nothing beyond the chain's post-quantum key registry.

Tests:
- `test_qcai1_openRegistration_cannotTouchOtherAttesters` (new): a newcomer registers their own key; the existing attester's key, nonce and status are unchanged, and the newcomer can't publish as them.
- `test_register_pubkeyMustMatchChainKey`: claiming another account's key reverts with `PubkeyMismatch`.
- `test_register_requiresChainKey`, `test_register_requiresMlDsa87`, `test_register_requiresPossessionProof`.
- `test_deactivate_blocksPublish_andKeyCannotBeRevived`.
- `test_replay_otherAttestersRequest`.

### QCAI-2 · MEDIUM · Potential overflow in nonce management

**Response: false positive. Covered by a regression test.**

The nonce is a `uint64` and the contract compiles with Solidity 0.8.28, where arithmetic is checked. `a.nonce = nonce + 1` therefore **reverts** at the maximum instead of wrapping to 0, so an old signature can never become valid again. Reaching the maximum would also take 2⁶⁴ ≈ 1.8 × 10¹⁹ signed, mined transactions from one attester.

Tests:
- `test_qcai2_nonceAtMaxReverts_neverWraps` (new): sets an attester's nonce to `type(uint64).max`, signs a valid request for it, and checks that publishing reverts with an arithmetic-overflow panic (`0x11`) and nothing is stored.
- `testFuzz_badNonceRejectedBeforeVerify`: any nonce other than the expected one is rejected.

### QCAI-3 · MEDIUM · Precompile availability check

**Response: by design: the contract fails closed. Covered by regression tests.**

`_pqcVerify` and `_keyStatus` call the precompiles with `staticcall`. They revert with `PrecompileUnavailable` if the call fails **or** if the answer isn't the expected size: 32 bytes for `pqcVerify`, at least 160 for `pqcKeyStatus`. That catches an inactive precompile, which on QoreChain returns empty data instead of reverting. It also catches a reverting precompile and a malformed answer.

The suggested "fallback" is deliberately absent. Without a precompile, the only fallbacks are to skip verification, which accepts unverified signatures, or to verify ML-DSA-87 in Solidity, which isn't practical at 4,627-byte signatures. Failing closed means no report is ever recorded without a checked post-quantum signature.

Tests:
- `test_precompileUnavailable_reverts`: both precompiles missing (empty code), so registration and publishing revert.
- `test_qcai3_revertingPrecompile_failsClosed` (new): a `pqcVerify` that reverts makes publishing revert with `PrecompileUnavailable`, and no report is stored.

### QCAI-4 · LOW · Replay protection: nonces unique per action type

**Response: false positive. The implementation is stricter than suggested. Covered by regression tests.**

Every signed message is `"RIVET/ATTEST/v1" ‖ abi.encode(action, chainId, contract, attester, nonce, deadline, payload)`. The **action is part of what is signed**, so a signature for one action can never pass as another. All actions also share **one strictly sequential nonce per attester**, so each signature is usable once, in order, across all actions. That's stricter than a separate nonce per action. Chain ID, contract address and deadline in the message stop cross-chain, cross-contract and stale replays.

Tests:
- `test_qcai4_publishSignatureCannotDeactivate` (new): a signed publish can't be replayed as a deactivation; the attester stays active.
- `test_qcai4_nonceSharedAcrossActions` (new): after a publish uses nonce 0, a revoke signed with nonce 0 reverts with `BadNonce(1, 0)`.
- `test_replay_wrongActionContext`: a revoke signature can't be used to publish.
- `test_revoke_wrongReportIdInPayload`, `test_replay_wrongChainId`, `test_replay_wrongContract`, `test_replay_sameSignatureTwice`, `test_replay_futureNonce`, `test_replay_expiredDeadline`.

The same replay cases were also run against the deployed contract on Diana: 10 of 10 behave as specified (on v1 in its report #2, and on v2 in its report #2; see [DEPLOYMENTS.md](../DEPLOYMENTS.md)).

## Stage 2 findings and responses

### QCAI-S2-1 · MEDIUM · Privilege escalation via key revocation bypass

**Response: real. Fixed in v2, with a regression test.**

The auditor's wording ("re-registration of a deactivated attester's key if the keyHash matches") doesn't match v1 literally. Re-registering the *same* revoked key directly was already blocked with `KeyRevoked`. But checking the finding uncovered a real gap next to it. v1 remembered only an attester's **current** key, so this sequence worked:

1. Key A is deactivated, for example after a suspected compromise.
2. The account rotates its QoreChain key to B and re-registers.
3. The account rotates back to A and re-registers. A could sign reports again.

Exploiting it needs the account owner to switch QoreChain's key for that account back to A, so a thief holding only key A can't do it alone. It still broke the contract's promise that a deactivated key can't be revived.

**Fix (v2).** A new `revokedKeys[attester][keyHash]` mapping is set by `deactivateAttester` and checked by `registerAttester`. A key an attester has deactivated can never be registered by that attester again, whatever happens in between.

Tests:
- `test_qcaiS2_revokedKeyCannotReturnAfterRotation` (new): A → deactivate → B → A reverts with `KeyRevoked`; B stays active and A can't sign. The same sequence succeeded against v1, which is how the gap was confirmed before fixing.
- `test_deactivate_blocksPublish_andKeyCannotBeRevived` still passes.

### QCAI-S2-2 · LOW · Missing input validation for URI length

**Response: no storage risk. Covered by a regression test.**

The contract never stores the URI, only its 32-byte `keccak256` hash (`uriHash`). Storage per report is the same whatever the URI's length. The full URI appears only in the `ReportPublished` event, it's covered by the attester's ML-DSA-87 signature, and whoever submits it pays for its calldata and log gas. A hard cap would add a rule without removing any risk.

Test:
- `test_qcaiS2_longUri_storesOnlyHash` (new): an 8 KB URI publishes and only its hash is stored, and a URI swapped after signing is rejected whatever its length.

### QCAI-S2-3 · INFO · Unbounded storage growth

**Response: by design.**

The registry is an append-only public record. Its purpose is that anyone can later check what was attested and when, so pruning old reports would delete the evidence. Growth is also self-limiting: every entry needs a valid ML-DSA-87 signature from a registered attester, a fresh nonce and a new report hash, and the sender pays the storage gas.

## Post-quantum design

### Where the precompiles are called, and what each call protects

| Precompile | Called from | What it protects |
|---|---|---|
| `pqcKeyStatus` at `0x…0a02` | `registerAttester` → `_keyStatus(msg.sender)` | **Who can attest.** The attester's key must be its QoreChain account key: registered, ML-DSA-87, with proof of possession, and identical to the key submitted. Rivet never accepts a key the chain hasn't bound to that account. In v2, a key the attester has deactivated is also refused for good. |
| `pqcVerify` at `0x…0a01` | `publishReport`, `revokeReport`, `deactivateAttester` → `_authorise` → `_pqcVerify` | **Every state change.** Each one needs a valid ML-DSA-87 signature over the domain-tagged message. The EVM sender doesn't matter, so anyone can relay, but nobody can forge. |
| `pqcVerify` at `0x…0a01` | `verifyAttestation` (view) | **Independent re-verification.** Anyone can re-check a stored report's original signature on-chain, using the public key and signature emitted in `ReportPublished`. |

### How the QoreChain account itself is admitted

EVM transactions on QoreChain are still signed with ECDSA. The chain admits them only from an account that has a registered ML-DSA-87 key (`MsgRegisterPQCKeyV2`, with proof of possession) and an open, hybrid-signed EVM window (`MsgOpenEVMWindow`). Rivet publishes inside a window **scoped** to the registry address only (`allowed_targets`). Transactions are listed in [DEPLOYMENTS.md](../DEPLOYMENTS.md).

### Tests that use real post-quantum signatures

The Foundry tests don't stub `pqcVerify`. `test/utils/PQCOracles.sol` installs a precompile at `0x…0a01` that calls a real ML-DSA-87 verifier (@noble/post-quantum) over FFI. Every contract test therefore signs and verifies genuine 4,627-byte ML-DSA-87 signatures. Only `pqcKeyStatus` is mocked, because the tests need to set its state.

Beyond Foundry:
- `engine/test/live.test.ts` calls the real precompile on Diana.
- The Attack Lab runs 16 signature attacks against noble, OpenSSL and `pqcVerify`.
- Four reports are published and independently verified on Diana, 11 of 11 checks each: two on v1 (finding F-1, before and after) and two on v2.
