import { createPublicClient, decodeFunctionResult, encodeFunctionData, http, keccak256 } from 'viem';
import type { MlDsaImpl, VerifyOutcome } from '../types.ts';
import { errMsg, toHex } from '../bytes.ts';
import { DIANA, diana } from './config.ts';

export const pqcAbi = [
  {
    type: 'function', name: 'pqcVerify', stateMutability: 'view',
    inputs: [{ name: 'pubkey', type: 'bytes' }, { name: 'signature', type: 'bytes' }, { name: 'message', type: 'bytes' }],
    outputs: [{ name: 'valid', type: 'bool' }],
  },
  {
    type: 'function', name: 'pqcKeyStatus', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'registered', type: 'bool' }, { name: 'algorithmId', type: 'uint8' }, { name: 'pubkey', type: 'bytes' }, { name: 'possessionProven', type: 'bool' }],
  },
] as const;

export const publicClient = createPublicClient({ chain: diana, transport: http(DIANA.evmRpc, { retryCount: 2, timeout: 30_000 }) });

/** Pins every on-chain verification in a run to one block, so a report is reproducible. */
let pinnedBlock: bigint | undefined;
export async function pinBlock(): Promise<bigint> {
  pinnedBlock = await publicClient.getBlockNumber();
  return pinnedBlock;
}

/**
 * Calls QoreChain's real pqcVerify precompile with eth_call. Never simulated.
 * `at` overrides the pinned block (used to check behaviour before and after a chain upgrade).
 */
export async function chainVerify(pk: Uint8Array, msg: Uint8Array, sig: Uint8Array, at?: bigint): Promise<VerifyOutcome> {
  const block = at ?? pinnedBlock;
  const data = encodeFunctionData({ abi: pqcAbi, functionName: 'pqcVerify', args: [toHex(pk), toHex(sig), toHex(msg)] });
  const evidence = {
    rpc: DIANA.evmRpc, chainId: DIANA.evmChainId, to: DIANA.pqcVerify,
    blockNumber: block?.toString(), calldataHash: keccak256(data),
  };
  try {
    const res = await publicClient.call({ to: DIANA.pqcVerify, data, blockNumber: block });
    if (!res.data || res.data === '0x') return { valid: false, error: 'precompile returned empty data (inactive?)', evidence };
    return { valid: decodeFunctionResult({ abi: pqcAbi, functionName: 'pqcVerify', data: res.data }), evidence };
  } catch (e) {
    return { valid: false, error: errMsg(e), evidence: { ...evidence, revert: errMsg(e) } };
  }
}

export async function keyStatus(account: `0x${string}`) {
  const [registered, algorithmId, pubkey, possessionProven] = await publicClient.readContract({
    address: DIANA.pqcKeyStatus, abi: pqcAbi, functionName: 'pqcKeyStatus', args: [account],
  });
  return { registered, algorithmId, pubkey, possessionProven };
}

/** The precompile as a verify-only implementation, so it slots into the same test matrix. */
export const qorechain: MlDsaImpl = {
  info: { id: 'qorechain', name: 'QoreChain pqcVerify precompile', version: 'Diana (live)', language: 'Go (on-chain)', backend: `eth_call ${DIANA.pqcVerify} @ chain ${DIANA.evmChainId}` },
  capabilities: { keygenFromSeed: false, sign: false, hedgedSign: false, deterministicSign: false, context: false, verify: true },
  async availability() {
    try {
      const id = await publicClient.getChainId();
      if (id !== DIANA.evmChainId) return { ok: false, reason: `RPC chain id ${id} != ${DIANA.evmChainId}` };
      const code = await publicClient.call({
        to: DIANA.pqcVerify,
        data: encodeFunctionData({ abi: pqcAbi, functionName: 'pqcVerify', args: ['0x', '0x', '0x'] }),
      });
      if (!code.data || code.data === '0x') return { ok: false, reason: 'pqcVerify precompile returned empty data (inactive on this network)' };
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: `RPC unreachable: ${errMsg(e)}` };
    }
  },
  publicKeyFromSeed: async () => {
    throw new Error('precompile is verify-only');
  },
  sign: async () => {
    throw new Error('precompile is verify-only');
  },
  async verify(pk, msg, sig, context) {
    if (context?.length) return { valid: false, error: 'precompile has no context parameter (empty context only)' };
    return chainVerify(pk, msg, sig);
  },
};
