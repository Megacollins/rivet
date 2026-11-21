// Deploy RivetRegistry to Diana and register the operator as an attester.
//
//   (cd contracts && forge build)
//   node engine/scripts/qore.ts window --blocks 300 --txs 3 --max-value 3000000   # unscoped: creation needs it
//   node engine/scripts/deploy.ts
//
// Both transactions are ordinary ECDSA-signed EVM txs. QoreChain admits them only
// because the operator has a registered ML-DSA-87 key and an open EVM window.
// Writes RIVET_REGISTRY into .env and appends to deployments/diana.json.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createWalletClient, http, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ml_dsa87 } from '@noble/post-quantum/ml-dsa.js';
import { evmToQor } from '@qorechain/sdk';
import { DIANA, diana } from '../src/chain/config.ts';
import { publicClient } from '../src/chain/precompile.ts';
import { registryAbi } from '../src/chain/registry.ts';
import { fromHex, toHex } from '../src/bytes.ts';

const root = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
try { process.loadEnvFile(root('.env')); } catch { /* env from shell */ }

const opKey = process.env.RIVET_OPERATOR_KEY as Hex | undefined;
const seed = process.env.RIVET_PQC_SEED;
if (!opKey || !seed) throw new Error('RIVET_OPERATOR_KEY / RIVET_PQC_SEED missing (run setup-operator.ts)');

const artifact = JSON.parse(readFileSync(root('contracts/out/RivetRegistry.sol/RivetRegistry.json'), 'utf8'));
const bytecode = artifact.bytecode.object as Hex;

const account = privateKeyToAccount(opKey);
const wallet = createWalletClient({ account, chain: diana, transport: http(DIANA.evmRpc) });
const pc = publicClient;

// The REST route takes the bech32 (qor1…) form of the account.
const win = await (await fetch(`${DIANA.rest}/qorechain/pqc/v1/evm_window/${evmToQor(account.address)}`)).json() as any;
if (!win.live) throw new Error('no live EVM window: open one first (qore.ts window)');
if (win.native_only || win.allowed_targets?.length) throw new Error('window is scoped: contract creation needs an unscoped window');
console.log(`window live: ${win.remaining_txs} txs, ${win.remaining_blocks} blocks, ${win.remaining_value} uqor left`);

// Opening the window advanced the account nonce: always read it fresh.
let nonce = await pc.getTransactionCount({ address: account.address, blockTag: 'pending' });

const deployHash = await wallet.deployContract({ abi: registryAbi, bytecode, nonce });
console.log(`deploy tx ${deployHash}`);
const deployRcpt = await pc.waitForTransactionReceipt({ hash: deployHash });
if (deployRcpt.status !== 'success' || !deployRcpt.contractAddress) throw new Error(`deploy failed: ${deployRcpt.status}`);
const registry = deployRcpt.contractAddress;
console.log(`RivetRegistry ${registry} (block ${deployRcpt.blockNumber}, gas ${deployRcpt.gasUsed})`);

const envPath = root('.env');
const env = readFileSync(envPath, 'utf8');
writeFileSync(envPath, /^RIVET_REGISTRY=.*$/m.test(env) ? env.replace(/^RIVET_REGISTRY=.*$/m, `RIVET_REGISTRY=${registry}`) : `${env.trimEnd()}\nRIVET_REGISTRY=${registry}\n`, { mode: 0o600 });

const pubkey = toHex(ml_dsa87.keygen(fromHex(seed)).publicKey);
nonce = await pc.getTransactionCount({ address: account.address, blockTag: 'pending' });
const { request } = await pc.simulateContract({ account, address: registry, abi: registryAbi, functionName: 'registerAttester', args: [pubkey] });
const regHash = await wallet.writeContract({ ...request, nonce });
console.log(`registerAttester tx ${regHash}`);
const regRcpt = await pc.waitForTransactionReceipt({ hash: regHash });
if (regRcpt.status !== 'success') throw new Error(`registerAttester failed: ${regRcpt.status}`);
const att = await pc.readContract({ address: registry, abi: registryAbi, functionName: 'attesters', args: [account.address] }) as readonly unknown[];
console.log(`attester registered (block ${regRcpt.blockNumber}, gas ${regRcpt.gasUsed}): ${JSON.stringify(att, (_, v) => typeof v === 'bigint' ? v.toString() : v)}`);

const depDir = root('deployments');
if (!existsSync(depDir)) mkdirSync(depDir);
const depFile = root('deployments/diana.json');
const record = {
  network: 'qorechain-diana', evmChainId: DIANA.evmChainId,
  RivetRegistry: { address: registry, deployTx: deployHash, block: Number(deployRcpt.blockNumber), deployer: account.address },
  attester: { address: account.address, registerTx: regHash, block: Number(regRcpt.blockNumber), pubkeyKeccak: (att as any)[0] },
  compiler: { solc: '0.8.28', evm: 'shanghai', viaIR: true, optimizerRuns: 200 },
  deployedAt: new Date().toISOString(),
};
writeFileSync(depFile, JSON.stringify(record, null, 2) + '\n');
console.log(`wrote deployments/diana.json`);
