/** Core types shared by the Rivet engine, CLI and web app. */

export type Status = 'pass' | 'fail' | 'skipped' | 'unsupported';
export type Suite = 'interop' | 'determinism' | 'attack' | 'replay';

export interface ImplInfo {
  id: string;
  name: string;
  version: string;
  language: string;
  backend: string;
}

export interface Capabilities {
  keygenFromSeed: boolean;
  sign: boolean;
  hedgedSign: boolean;
  deterministicSign: boolean;
  context: boolean;
  verify: boolean;
}

export interface Availability {
  ok: boolean;
  reason?: string;
}

/** Keys are represented by their 32-byte FIPS 204 seed so every implementation can derive its own key pair. */
export interface SignOpts {
  deterministic: boolean;
  context?: Uint8Array;
}

/**
 * One ML-DSA-87 implementation under test. Signers derive keys from a seed so cross-implementation
 * key derivation is itself tested. Verifiers receive raw bytes only and must never throw on bad input:
 * any internal error counts as a rejection and is reported in `detail`.
 */
export interface MlDsaImpl {
  info: ImplInfo;
  capabilities: Capabilities;
  availability(): Promise<Availability>;
  publicKeyFromSeed(seed: Uint8Array): Promise<Uint8Array>;
  sign(seed: Uint8Array, msg: Uint8Array, opts: SignOpts): Promise<Uint8Array>;
  verify(pk: Uint8Array, msg: Uint8Array, sig: Uint8Array, context?: Uint8Array): Promise<VerifyOutcome>;
}

export interface VerifyOutcome {
  valid: boolean;
  /** Set when the verifier threw / reverted instead of returning false. */
  error?: string;
  evidence?: Evidence;
}

export interface Evidence {
  rpc?: string;
  chainId?: number;
  blockNumber?: string;
  to?: string;
  calldataHash?: string;
  revert?: string;
}

export interface TestResult {
  id: string;
  suite: Suite;
  name: string;
  signer?: string;
  verifier: string;
  vector?: string;
  expected: string;
  actual: string;
  status: Status;
  critical?: boolean;
  detail?: string;
  evidence?: Evidence;
  durationMs: number;
}

export interface Vector {
  id: string;
  description: string;
  seedHex: string;
  messageHex: string;
}
