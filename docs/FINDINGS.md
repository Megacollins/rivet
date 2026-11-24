# Rivet findings

## F-1: `pqcVerify` rejected valid ML-DSA-87 signatures over the empty message (fixed)

| | |
|---|---|
| Network | QoreChain Diana testnet, EVM chain id 9800, chain v3.2.8 |
| Precompile | `pqcVerify(bytes,bytes,bytes)` at `0x0000000000000000000000000000000000000a01` |
| First observed | 2026-11-21 (block ~10,501,500) |
| Type | Conformance divergence: false rejection, not a false acceptance |
| Security impact | None found. No forged or tampered input was ever accepted. |
| Status | **Fixed on Diana at block 10,654,800** (2026-11-24 07:32:21 UTC). |

**Observation.** Up to block 10,654,799, for a signature over the 0-byte message `M = ""`, the precompile returned `false`. FIPS 204 permits empty messages.

- Both reference implementations accept the same signature: @noble/post-quantum 0.7.1 and OpenSSL 3.5.6.
- This holds for hedged and deterministic signatures, and for signatures made by either library.
- A 1-byte message, including `0x00`, verified correctly.

**Fix.** From block 10,654,800 the precompile accepts the same signatures. The switch happens at exactly one height, which points to a chain upgrade. Rivet's reports 1 (block 10,507,117, 3 failures on this vector) and 2 (block 10,664,547, 0 failures) on registry v1 (`0x2afd0bfb2cae5b1f3d0a96265f7b314cb514205c`) are both attested on chain, before and after.

**Reproduce** (independent of Rivet's own encoding; uses Foundry's `cast`):

```
node engine/scripts/empty-msg-repro.ts
empty (0 bytes)  noble=true  precompile@10654799=false  precompile@latest=true
one zero byte    noble=true  precompile@10654799=true  precompile@latest=true
"a"              noble=true  precompile@10654799=true  precompile@latest=true
```

It is pinned as a live regression test in `engine/test/live.test.ts`: rejected at block 10,654,799, accepted at 10,654,800 and at the latest block.

**Implication for dApps.** Empty messages now verify. A contract that must also work against older state should still avoid them. `RivetRegistry` signs a fixed-length, domain-tagged message of at least 239 bytes, so it was never affected.

## Tooling notes (not chain issues)

- OpenSSL 3.5.6's `pkeyutl -rawin` can't sign a 0-byte input file. It fails with "Could not allocate 0 bytes for oneshot sign/verify buffer". Rivet reports that cell as `unsupported`.
- Node's `node:crypto` exposes ML-DSA-87 (via OpenSSL), including context strings, but has no deterministic mode. Rivet uses the `openssl` command-line tool for deterministic signatures.
