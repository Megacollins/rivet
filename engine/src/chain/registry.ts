import { concat, encodeAbiParameters, keccak256, toBytes, toHex as vToHex } from 'viem';

/**
 * Independent re-implementation of RivetRegistry's signed-message encoding.
 * Tests cross-check it byte-for-byte against the contract's `signingMessage()` view.
 */
export const DOMAIN_TAG = 'RIVET/ATTEST/v1';
export const ACTION = { publish: 1, revoke: 2, deactivate: 3 } as const;
export type Action = keyof typeof ACTION;

export interface Summary {
  passed: number;
  failed: number;
  skipped: number;
  unsupported: number;
}

const summaryType = {
  type: 'tuple',
  components: [
    { name: 'passed', type: 'uint32' }, { name: 'failed', type: 'uint32' },
    { name: 'skipped', type: 'uint32' }, { name: 'unsupported', type: 'uint32' },
  ],
} as const;

export function publishPayload(reportHash: `0x${string}`, summary: Summary, uri: string): `0x${string}` {
  const uriHash = keccak256(toBytes(uri));
  return keccak256(encodeAbiParameters([{ type: 'bytes32' }, summaryType, { type: 'bytes32' }], [reportHash, summary, uriHash]));
}

export function revokePayload(reportId: bigint): `0x${string}` {
  return keccak256(encodeAbiParameters([{ type: 'uint256' }], [reportId]));
}

export interface Domain {
  chainId: number | bigint;
  registry: `0x${string}`;
}

export function signingMessage(
  domain: Domain,
  action: number,
  attester: `0x${string}`,
  nonce: bigint,
  deadline: bigint,
  payload: `0x${string}`,
): Uint8Array {
  const body = encodeAbiParameters(
    [{ type: 'uint8' }, { type: 'uint256' }, { type: 'address' }, { type: 'address' }, { type: 'uint64' }, { type: 'uint64' }, { type: 'bytes32' }],
    [action, BigInt(domain.chainId), domain.registry, attester, nonce, deadline, payload],
  );
  return toBytes(concat([vToHex(DOMAIN_TAG), body]));
}

export const registryAbi = [
  { type: 'function', name: 'attesters', stateMutability: 'view', inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: 'keyHash', type: 'bytes32' }, { name: 'nonce', type: 'uint64' }, { name: 'registeredAt', type: 'uint64' }, { name: 'active', type: 'bool' }] },
  { type: 'function', name: 'reportCount', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'reportIdByHash', stateMutability: 'view', inputs: [{ type: 'bytes32' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'registerAttester', stateMutability: 'nonpayable', inputs: [{ name: 'pubkey', type: 'bytes' }], outputs: [] },
  { type: 'function', name: 'publishReport', stateMutability: 'nonpayable',
    inputs: [
      { name: 'req', type: 'tuple', components: [
        { name: 'attester', type: 'address' }, { name: 'reportHash', type: 'bytes32' },
        { name: 'summary', ...summaryType }, { name: 'uri', type: 'string' },
        { name: 'nonce', type: 'uint64' }, { name: 'deadline', type: 'uint64' }] },
      { name: 'pubkey', type: 'bytes' }, { name: 'signature', type: 'bytes' }],
    outputs: [{ name: 'reportId', type: 'uint256' }] },
  { type: 'function', name: 'revokeReport', stateMutability: 'nonpayable',
    inputs: [{ name: 'reportId', type: 'uint256' }, { name: 'nonce', type: 'uint64' }, { name: 'deadline', type: 'uint64' }, { name: 'pubkey', type: 'bytes' }, { name: 'signature', type: 'bytes' }], outputs: [] },
  { type: 'function', name: 'getReport', stateMutability: 'view', inputs: [{ name: 'reportId', type: 'uint256' }],
    outputs: [{ type: 'tuple', components: [
      { name: 'attester', type: 'address' }, { name: 'reportHash', type: 'bytes32' }, { name: 'uriHash', type: 'bytes32' },
      { name: 'keyHash', type: 'bytes32' }, { name: 'summary', ...summaryType }, { name: 'nonce', type: 'uint64' },
      { name: 'deadline', type: 'uint64' }, { name: 'publishedAt', type: 'uint64' }, { name: 'revoked', type: 'bool' }] }] },
  { type: 'function', name: 'verifyAttestation', stateMutability: 'view',
    inputs: [{ name: 'reportId', type: 'uint256' }, { name: 'pubkey', type: 'bytes' }, { name: 'signature', type: 'bytes' }], outputs: [{ name: 'valid', type: 'bool' }] },
  { type: 'function', name: 'signingMessage', stateMutability: 'view',
    inputs: [{ name: 'action', type: 'uint8' }, { name: 'attester', type: 'address' }, { name: 'nonce', type: 'uint64' }, { name: 'deadline', type: 'uint64' }, { name: 'payload', type: 'bytes32' }],
    outputs: [{ type: 'bytes' }] },
  { type: 'event', name: 'ReportPublished', inputs: [
    { name: 'reportId', type: 'uint256', indexed: true }, { name: 'attester', type: 'address', indexed: true },
    { name: 'reportHash', type: 'bytes32', indexed: true }, { name: 'summary', ...summaryType, indexed: false },
    { name: 'uri', type: 'string', indexed: false }, { name: 'nonce', type: 'uint64', indexed: false },
    { name: 'deadline', type: 'uint64', indexed: false }, { name: 'pubkey', type: 'bytes', indexed: false },
    { name: 'signature', type: 'bytes', indexed: false }] },
  { type: 'event', name: 'ReportRevoked', inputs: [
    { name: 'reportId', type: 'uint256', indexed: true }, { name: 'attester', type: 'address', indexed: true }, { name: 'nonce', type: 'uint64', indexed: false }] },
  { type: 'event', name: 'AttesterRegistered', inputs: [
    { name: 'attester', type: 'address', indexed: true }, { name: 'keyHash', type: 'bytes32', indexed: true }] },
  ...['PrecompileUnavailable(address)', 'KeyNotRegistered()', 'WrongAlgorithm(uint8)', 'PossessionNotProven()', 'PubkeyMismatch()',
    'BadPubkeyLength(uint256)', 'BadSignatureLength(uint256)', 'UnknownAttester()', 'AttesterInactive()', 'BadNonce(uint64,uint64)',
    'Expired(uint64,uint256)', 'InvalidSignature()', 'DuplicateReport(uint256)', 'EmptyReportHash()', 'UnknownReport()',
    'AlreadyRevoked()', 'KeyRevoked()'].map(errorAbi),
] as const;

function errorAbi(sig: string) {
  const [, name, args] = /^(\w+)\((.*)\)$/.exec(sig)!;
  return { type: 'error' as const, name: name!, inputs: args ? args.split(',').map((t) => ({ name: '', type: t })) : [] };
}
