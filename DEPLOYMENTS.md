# Deployments

## QoreChain Diana testnet (`qorechain-diana`, EVM chain id 9800)

| What | Address / tx | Block |
|---|---|---|
| **RivetRegistry** | `0x2afd0bfb2cae5b1f3d0a96265f7b314cb514205c` | 10,507,055 |
| Deploy tx | `0x5789bbe16c2bdc35b19d83709b54dc7591ac44d1ded4447b8ac4d06ab346ec3a` | 10,507,055 |
| Operator / attester (EVM) | `0x5A3B5C03600cFF660587B1c64f6190974792403F` | |
| Operator / attester (native) | `qor1tga4cqmqpnlkvpv8k8ry7cvsjareyspla69l6y` | |
| `registerAttester` tx | `0x5bd51b0437469fa44e2c411363894c7edcd35e2a2defc1675535ac0eae392cad` | 10,507,057 |
| First published report (id 1) | `0xdbb38f2bfb34d14c57a2ea2bdb04fe4c6b516bf41b6b844d696f374a717f380b` | 10,507,117 |

Web app: https://rivet-alpha-rose.vercel.app (Vercel, Node 24). It is read-only: no operator keys are configured there, so it can run the suites and verify attestations but can't publish. Because the OpenSSL command-line tool isn't available there, deterministic OpenSSL signing is reported as unsupported.

Explorer: https://explore.qore.network. The machine-readable record is `deployments/diana.json`.

Compiler: solc 0.8.28, EVM `shanghai`, via-IR, optimizer 200 runs (`contracts/foundry.toml`).

### How the operator account was admitted (native lane)

EVM transactions on QoreChain are signed with classical ECDSA. The chain admits them only from an account that has a registered ML-DSA-87 key **and** an open EVM window. Both of those are native-lane messages, sent by `engine/scripts/qore.ts`:

| Step | Message | Signed with | Tx | Block |
|---|---|---|---|---|
| 1 | `MsgRegisterPQCKeyV2` (ML-DSA-87, key type `hybrid`, proof of possession) | ECDSA only. The chain's bootstrap exemption; it must be the account's first tx. | `1DA84D08822C79BBE2871DD51D0F3A8E4C8150D76AE005C94DACD416F1AFBC9B` | 10,506,660 |
| 2 | `MsgOpenEVMWindow`: 300 blocks, 3 txs, 3 QOR, **unscoped** (contract creation needs it) | Hybrid: ECDSA + ML-DSA-87 | `52396E87EBF32C9A593FD3E4FB97C5F79A3919ABDE5E627E51BDF1EAAEC894BD` | 10,506,787 |
| 3 | `MsgOpenEVMWindow`: 2,400 blocks, 5 txs, 3 QOR, **scoped** to `allowed_targets = [RivetRegistry]` | Hybrid | `0E2662A6942177C7FFCBD52D1925738145BFF0149CD8910CFB5FFA869FABCFA9` | 10,507,075 |

After step 1, `pqcKeyStatus(0x5A3B…403F)` at `0x…0a02` returns `registered=true`, `algorithmId=1`, a 2,592-byte key, and `possessionProven=true`.

The deploy and `registerAttester` txs ran inside window 2. All later report publishing runs inside a window scoped to the registry alone. A scoped window refuses contract creation and any other target.

### Live verification (2026-11-21)

- `node engine/src/cli.ts run`: 136 tests; 125 passed, 3 failed (finding F-1, empty message; 0 critical), 1 skipped, 7 unsupported. The 1 skip was the spent-nonce replay case, which needs a published report; it passed on the rerun after report 1 was published.
- `node engine/src/cli.ts run --suites replay` on the deployed registry: all 10 replay cases behave as specified. The control succeeds. Wrong chain id, wrong contract, wrong action, payload from another action, and summary tampering revert `InvalidSignature`. Future and spent nonces revert `BadNonce`. An expired deadline reverts `Expired`. The engine's encoding of the signed message is identical to `signingMessage()` (239 bytes).
- `node engine/src/cli.ts verify 1 --file reports/<run>.json`: 11 of 11 independent checks pass.
  - The signature is valid under noble, OpenSSL, and `pqcVerify` (via `eth_call`).
  - `verifyAttestation()` returns true.
  - The key hash matches the attester's x/pqc key.
  - The report JSON hash and summary match what is on chain.
- `publishReport` used 508,182 gas, including the real `pqcVerify` call made inside a transaction.
