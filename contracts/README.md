# Rivet contracts

`RivetRegistry` anchors Rivet compatibility reports on QoreChain. Every publish, revoke or deactivation is authorised by an ML-DSA-87 signature, checked on-chain by the `pqcVerify` precompile (`0x…0a01`). The attester's key must be the x/pqc key that `pqcKeyStatus` (`0x…0a02`) reports for that account.

Deployed on Diana (EVM chain id 9800): `0x2afd0bfb2cae5b1f3d0a96265f7b314cb514205c`. See [../DEPLOYMENTS.md](../DEPLOYMENTS.md).

```bash
forge build
forge test -vv     # 28 tests
```

The tests replace both precompiles with `vm.etch`. `pqcVerify` is served by a real ML-DSA-87 verifier (`engine/src/ffi.ts`, @noble/post-quantum) over FFI, so every test signs and verifies real signatures. This requires `node` ≥ 24.7 on `PATH` and `npm install` at the repo root.
