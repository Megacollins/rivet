// Creates the operator account's secrets in <repo>/.env if they are missing.
// Prints ONLY public data (addresses, key hash). Never prints or logs a secret.
//
//   node engine/scripts/setup-operator.ts
//
// RIVET_OPERATOR_KEY  eth_secp256k1 key: signs (classical ECDSA) every EVM tx
// RIVET_PQC_SEED      32-byte ML-DSA-87 seed: the account's x/pqc key, which
//                     authorises the EVM window and signs Rivet attestations
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { bech32 } from '@scure/base';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { keccak256, type Hex } from 'viem';
import { ml_dsa87 } from '@noble/post-quantum/ml-dsa.js';
import { fromHex, toHex } from '../src/bytes.ts';

const envPath = fileURLToPath(new URL('../../.env', import.meta.url));
const examplePath = fileURLToPath(new URL('../../.env.example', import.meta.url));

let text = existsSync(envPath) ? readFileSync(envPath, 'utf8') : readFileSync(examplePath, 'utf8');

const get = (k: string): string | undefined => text.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim() || undefined;
const set = (k: string, v: string): void => {
  const re = new RegExp(`^${k}=.*$`, 'm');
  text = re.test(text) ? text.replace(re, `${k}=${v}`) : `${text.trimEnd()}\n${k}=${v}\n`;
};

const created: string[] = [];
let opKey = get('RIVET_OPERATOR_KEY') as Hex | undefined;
if (!opKey) { opKey = generatePrivateKey(); set('RIVET_OPERATOR_KEY', opKey); created.push('RIVET_OPERATOR_KEY'); }
let seed = get('RIVET_PQC_SEED');
if (!seed) { seed = toHex(randomBytes(32)); set('RIVET_PQC_SEED', seed); created.push('RIVET_PQC_SEED'); }

const address = privateKeyToAccount(opKey).address;
if (get('RIVET_ATTESTER')?.toLowerCase() !== address.toLowerCase()) set('RIVET_ATTESTER', address);

writeFileSync(envPath, text, { mode: 0o600 });

const qor = bech32.encode('qor', bech32.toWords(fromHex(address)));
const pk = ml_dsa87.keygen(fromHex(seed)).publicKey;

console.log(created.length ? `created in .env: ${created.join(', ')}` : '.env already had both secrets; nothing generated');
console.log(`EVM address     ${address}`);
console.log(`QoreChain addr  ${qor}`);
console.log(`ML-DSA-87 pk    ${pk.length} bytes, keccak256 ${keccak256(pk)}`);
