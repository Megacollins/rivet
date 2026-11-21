# Rivet findings

## F-1: `pqcVerify` rejects valid ML-DSA-87 signatures over the empty message

| | |
|---|---|
| Network | QoreChain Diana testnet, EVM chain id 9800, chain v3.2.8 |
| Precompile | `pqcVerify(bytes,bytes,bytes)` at `0x0000000000000000000000000000000000000a01` |
| First observed | 2026-11-21 (block ~10,501,500) |
| Type | Conformance divergence: false rejection, not a false acceptance |
| Security impact | None found. No forged or tampered input was ever accepted. |

**Observation.** For a signature over the 0-byte message `M = ""`, the precompile returns `false`. FIPS 204 permits empty messages.

- Both reference implementations accept the same signature: @noble/post-quantum 0.7.1 and OpenSSL 3.5.6.
- This holds for hedged and deterministic signatures, and for signatures made by either library.
- A 1-byte message, including `0x00`, verifies correctly.

**Reproduce** (independent of Rivet's own encoding; uses Foundry's `cast`):

```
node engine/scripts/empty-msg-repro.ts
empty (0 bytes)  noble=true  precompile=false
one zero byte    noble=true  precompile=true
"a"              noble=true  precompile=true
```

It is also pinned as a regression test: `engine/test/live.test.ts`, "KNOWN DIVERGENCE".

**Implication for dApps.** Never ask the precompile to verify an empty message. `RivetRegistry` signs a fixed-length, domain-tagged message of at least 239 bytes, so it is not affected.

## Tooling notes (not chain issues)

- OpenSSL 3.5.6's `pkeyutl -rawin` can't sign a 0-byte input file. It fails with "Could not allocate 0 bytes for oneshot sign/verify buffer". Rivet reports that cell as `unsupported`.
- Node's `node:crypto` exposes ML-DSA-87 (via OpenSSL), including context strings, but has no deterministic mode. Rivet uses the `openssl` command-line tool for deterministic signatures.
