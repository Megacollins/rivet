# Deployments

## QoreChain Diana testnet (`qorechain-diana`, EVM chain id 9800)

### RivetRegistry v2 (current)

Redeployed on 2026-11-24 with the fix for the QCAI stage 2 finding: a deactivated key now stays revoked even after the attester rotates to another key and back. See [docs/AUDIT.md](docs/AUDIT.md). The attester is the same operator account and ML-DSA-87 key as in v1.

| What | Address / tx | Block |
|---|---|---|
| **RivetRegistry v2** | `0xbff74b159e7b5988c8a0030c817363074322acd4` | 10,674,964 |
| Deploy tx | `0xbc95d9e4c30eb17a201e659e6917aecde028d0149609e1a20f2bbe6324514d0e` | 10,674,964 |
| `registerAttester` tx | `0xef071ed8fa0c1c507078213c5cb710cffdc24aa2ee71b7dc2281ea771c36f271` | 10,674,967 |
| Report id 1 (`d69639b8…`: 128 passed, 0 failed, 1 skipped) | `0xb482d15ac56ef820b6fe4fcf4bf8d98dbb4f72b4020642d2e935d0171e195b26` | 10,675,043 |
| Report id 2 (`622e1296…`: 129 passed, 0 failed, 0 skipped) | `0x2f773b65f14200ee0df19efc669152c763248919eb8eb4a108d3e2dcedd51071` | 10,675,069 |

Native transactions:
- unscoped window for the deploy: `BF70672032D9D068203407FDEA9F7B9CAF8662D59181FBF5EA08811D69A39A18`, block 10,674,935;
- window scoped to v2 only: `2587609A8EC8EFC09D55F114A723675FD96C4AC16737D5B20E69A1F823CFBE51`, block 10,674,998.

The deployed runtime bytecode is identical to `contracts/out` built from this commit, checked with `eth_getCode`. Both reports are independently verified, 11 of 11 checks each (`node engine/src/cli.ts verify <id> --file …`). The 1 skip in report 1 is the spent-nonce replay case, which needs an existing report; it passes in report 2. The machine-readable record is `deployments/diana.json`; v1's is `deployments/diana.v1.json`.

### RivetRegistry v1 (superseded; keeps the F-1 before/after reports)

| What | Address / tx | Block |
|---|---|---|
| **RivetRegistry v1** | `0x2afd0bfb2cae5b1f3d0a96265f7b314cb514205c` | 10,507,055 |
| Deploy tx | `0x5789bbe16c2bdc35b19d83709b54dc7591ac44d1ded4447b8ac4d06ab346ec3a` | 10,507,055 |
| Operator / attester (EVM) | `0x5A3B5C03600cFF660587B1c64f6190974792403F` | |
| Operator / attester (native) | `qor1tga4cqmqpnlkvpv8k8ry7cvsjareyspla69l6y` | |
| `registerAttester` tx | `0x5bd51b0437469fa44e2c411363894c7edcd35e2a2defc1675535ac0eae392cad` | 10,507,057 |
| First published report (id 1) | `0xdbb38f2bfb34d14c57a2ea2bdb04fe4c6b516bf41b6b844d696f374a717f380b` | 10,507,117 |
| Second published report (id 2) | `0x3dd4bc8becdd0e1b377173474490d1a7e03a2b7b0206f4d639564d742431ebf9` | 10,664,547 |

Web app: https://rivetpq.vercel.app (Vercel, Node 24). It is read-only: no operator keys are configured there, so it can run the suites and verify attestations but can't publish. Because the OpenSSL command-line tool isn't available there, deterministic OpenSSL signing is reported as unsupported.

Explorer: https://explore.qore.network. v1's machine-readable record is `deployments/diana.v1.json`.

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

### Full loop rerun (2026-11-24)

- `qore.ts window`: a new window scoped to RivetRegistry (2,400 blocks, 5 txs), native tx `EA1405F791CDA86B2B657831D088A5CE348998252666B36C66939B55D0758F72` at block 10,664,446.
- `node engine/src/cli.ts run`: 136 tests; **129 passed, 0 failed**, 0 skipped, 7 unsupported. Replay 10 of 10. Report `d9609615-3f96-4f8c-956e-e24b48686346`, hash `0x4415a2ab…fb82136a`.
- `node engine/src/cli.ts publish`: report id 2, 490,866 gas, block 10,664,547.
- `node engine/src/cli.ts verify 2 --file …`: 11 of 11 independent checks pass.

**Finding F-1 no longer reproduces.** The same ML-DSA-87 signature over the empty message, sent to `pqcVerify` by `eth_call`, returns `false` at every block up to 10,654,799 and `true` from block 10,654,800 (2026-11-24 07:32:21 UTC). One-byte messages verify at every block checked. The clean switch at one height suggests a chain upgrade. Report 1 (before the change) and report 2 (after it) both stay on chain as a record.
