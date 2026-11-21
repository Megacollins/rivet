import { defineChain } from 'viem';

/** QoreChain Diana testnet. Sources: docs.qorechain.io/getting-started/connecting-to-testnet. */
export const DIANA = {
  cosmosChainId: 'qorechain-diana',
  evmChainId: 9800,
  evmRpc: process.env.RIVET_EVM_RPC ?? 'https://evm-testnet.qore.host',
  rest: process.env.RIVET_REST ?? 'https://api-testnet.qore.host',
  rpc: process.env.RIVET_COMET_RPC ?? 'https://rpc-testnet.qore.host',
  explorer: 'https://explore.qore.network',
  pqcVerify: '0x0000000000000000000000000000000000000a01',
  pqcKeyStatus: '0x0000000000000000000000000000000000000a02',
} as const;

export const diana = defineChain({
  id: DIANA.evmChainId,
  name: 'QoreChain Diana',
  nativeCurrency: { name: 'QOR', symbol: 'QOR', decimals: 18 },
  rpcUrls: { default: { http: [DIANA.evmRpc] } },
  blockExplorers: { default: { name: 'QoreChain Explorer', url: DIANA.explorer } },
  testnet: true,
});

export const registryAddress = (): `0x${string}` | undefined => {
  const a = process.env.RIVET_REGISTRY;
  return a && /^0x[0-9a-fA-F]{40}$/.test(a) ? (a as `0x${string}`) : undefined;
};
