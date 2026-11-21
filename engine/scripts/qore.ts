// Native-lane admin for the operator account (QoreChain Diana).
//
//   node engine/scripts/qore.ts status
//   node engine/scripts/qore.ts register
//   node engine/scripts/qore.ts window --blocks 600 --txs 5 --max-value 5000000 [--targets 0xA,0xB] [--native-only]
//   node engine/scripts/qore.ts close-window
//
// Why this exists: EVM transactions on QoreChain are signed with classical ECDSA,
// but the chain only ADMITS them from an account that (1) has a registered
// ML-DSA-87 key and (2) has an open EVM window. Both are native-lane messages:
// registration is signed classically (the chain's one bootstrap exemption, and it
// must be the account's first tx); the window is hybrid-signed (ECDSA + ML-DSA-87).
//
// Uses only @qorechain/sdk 0.14.0 exports. Prints no secrets.
import { createECDH } from 'node:crypto';
import { StargateClient } from '@cosmjs/stargate';
import {
  EthNativeSigner,
  addressesFrom20,
  buildRegisterPqcKeyMsg,
  closeEvmWindowMsg,
  generatePqcKeypair,
  openEvmWindowMsg,
  signProofOfPossession,
  type UnifiedAccount,
} from '@qorechain/sdk';
import { DIANA } from '../src/chain/config.ts';
import { fromHex, toHex } from '../src/bytes.ts';

for (const p of ['.env', '../.env']) { try { process.loadEnvFile(p); break; } catch { /* next */ } }

const need = (k: string): string => {
  const v = process.env[k];
  if (!v) throw new Error(`${k} is not set (run engine/scripts/setup-operator.ts)`);
  return v;
};

const REST = DIANA.rest;
const COSMOS_CHAIN_ID = DIANA.cosmosChainId;
const GAS_PRICE_UQOR = 0.15; // SDK default; chain floor is 0.1uqor

function loadAccount(): UnifiedAccount {
  const priv = fromHex(need('RIVET_OPERATOR_KEY'));
  const ecdh = createECDH('secp256k1');
  ecdh.setPrivateKey(priv);
  // The eth address (keccak256 of the pubkey) was derived by viem in setup-operator.ts.
  return {
    ...addressesFrom20(fromHex(need('RIVET_ATTESTER'))),
    privateKey: toHex(priv),
    publicKey: toHex(new Uint8Array(ecdh.getPublicKey(null, 'compressed'))),
    pqc: generatePqcKeypair(fromHex(need('RIVET_PQC_SEED'))),
  };
}

async function getJson(path: string): Promise<any> {
  const r = await fetch(`${REST}${path}`);
  if (r.status === 404) return undefined;
  if (!r.ok) throw new Error(`GET ${path}: HTTP ${r.status}`);
  return r.json();
}

async function accountSeq(addr: string): Promise<{ accountNumber: bigint; sequence: bigint }> {
  const j = await getJson(`/cosmos/auth/v1beta1/accounts/${addr}`);
  if (!j) throw new Error(`account ${addr} does not exist on chain yet (no funds received)`);
  const a = j.account.base_account ?? j.account;
  return { accountNumber: BigInt(a.account_number), sequence: BigInt(a.sequence ?? 0) };
}

const fee = (gas: number) => ({ amount: [{ denom: 'uqor', amount: String(Math.ceil(gas * GAS_PRICE_UQOR)) }], gas: String(gas) });

async function status(acct: UnifiedAccount): Promise<void> {
  const bal = await getJson(`/cosmos/bank/v1beta1/balances/${acct.cosmos}`);
  const auth = await getJson(`/cosmos/auth/v1beta1/accounts/${acct.cosmos}`);
  const pqc = await getJson(`/qorechain/pqc/v1/account/${acct.cosmos}`);
  const win = await getJson(`/qorechain/pqc/v1/evm_window/${acct.cosmos}`);
  console.log(`account   ${acct.cosmos}  /  ${acct.evm}`);
  console.log(`balance   ${JSON.stringify(bal?.balances ?? [])}`);
  console.log(`auth      ${auth ? `exists, sequence ${(auth.account.base_account ?? auth.account).sequence ?? 0}` : 'not on chain'}`);
  const pk = pqc?.account?.public_key ?? pqc?.account?.publicKey;
  const ours = Buffer.from(acct.pqc.publicKey).toString('base64');
  console.log(`pqc key   ${pqc?.found ? `registered, algorithm ${pqc.account.algorithm_id ?? pqc.account.algorithmId}, matches RIVET_PQC_SEED: ${pk === ours}` : 'not registered'}`);
  console.log(`window    ${JSON.stringify(win ?? null)}`);
}

async function send(acct: UnifiedAccount, mode: 'classical' | 'hybrid', messages: any[], gas: number) {
  const { accountNumber, sequence } = await accountSeq(acct.cosmos);
  const signer = new EthNativeSigner(acct, { signMode: mode, rest: REST });
  const transport = await StargateClient.connect(DIANA.rpc);
  try {
    const res = await signer.signAndBroadcast(transport, {
      chainId: COSMOS_CHAIN_ID, accountNumber, sequence, messages, fee: fee(gas),
    });
    console.log(`tx ${res.transactionHash} code=${res.code} height=${res.height ?? '?'} gasUsed=${res.gasUsed ?? '?'}/${res.gasWanted ?? '?'}`);
    if (res.code !== 0) { console.log(res.rawLog); process.exitCode = 1; }
    return res;
  } finally {
    transport.disconnect();
  }
}

async function register(acct: UnifiedAccount): Promise<void> {
  const existing = await getJson(`/qorechain/pqc/v1/account/${acct.cosmos}`);
  if (existing?.found) { console.log('already registered; nothing sent'); return; }
  const { sequence } = await accountSeq(acct.cosmos);
  if (sequence !== 0n) throw new Error(`sequence is ${sequence}: registration must be the account's first tx`);
  const proofOfPossession = signProofOfPossession({ chainId: COSMOS_CHAIN_ID, account: acct.cosmos, algorithmId: 1, keypair: acct.pqc });
  const msg = buildRegisterPqcKeyMsg(acct.cosmos, {
    pqcKeypair: acct.pqc,
    ecdsaPubkey: fromHex(acct.publicKey),
    keyType: 'hybrid',
    proofOfPossession,
  });
  await send(acct, 'classical', [msg], 600_000);
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

async function openWindow(acct: UnifiedAccount): Promise<void> {
  const targets = arg('targets')?.split(',').filter(Boolean) ?? [];
  const msg = openEvmWindowMsg({
    sender: acct.cosmos,
    blocks: Number(arg('blocks') ?? 600),
    maxTxs: Number(arg('txs') ?? 5),
    maxValue: arg('max-value') ?? '5000000',
    nativeOnly: process.argv.includes('--native-only'),
    allowedTargets: targets,
  });
  console.log(`opening window: ${JSON.stringify(msg.value)}`);
  await send(acct, 'hybrid', [msg], 500_000);
  console.log('note: opening a window advances the account nonce; re-read it before EVM txs');
}

const acct = loadAccount();
const cmd = process.argv[2];
if (cmd === 'status') await status(acct);
else if (cmd === 'register') { await register(acct); await status(acct); }
else if (cmd === 'window') { await openWindow(acct); await status(acct); }
else if (cmd === 'close-window') { await send(acct, 'hybrid', [closeEvmWindowMsg(acct.cosmos)], 400_000); await status(acct); }
else { console.error('usage: qore.ts status | register | window [...] | close-window'); process.exitCode = 2; }
