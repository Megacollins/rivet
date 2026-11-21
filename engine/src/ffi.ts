/**
 * FFI bridge for Foundry tests (`vm.ffi`). Produces REAL ML-DSA-87 keys/signatures and verifies them,
 * so the contract tests exercise genuine signatures instead of a stubbed precompile answer.
 *
 *   node engine/src/ffi.ts pubkey <seedHex>              -> 0x<2592-byte pubkey>
 *   node engine/src/ffi.ts sign <seedHex> <msgHex>       -> 0x<4627-byte deterministic signature>
 *   node engine/src/ffi.ts verify <pk> <sig> <msg>       -> ABI-encoded bool (32 bytes)
 *
 * Output is a single hex string on stdout (Foundry decodes it as bytes).
 */
import { ml_dsa87 } from '@noble/post-quantum/ml-dsa.js';
import { fromHex, toHex } from './bytes.ts';

const [cmd, ...args] = process.argv.slice(2);
const out = (b: Uint8Array) => process.stdout.write(toHex(b));

switch (cmd) {
  case 'pubkey':
    out(ml_dsa87.keygen(fromHex(args[0]!)).publicKey);
    break;
  case 'sign': {
    const { secretKey } = ml_dsa87.keygen(fromHex(args[0]!));
    out(ml_dsa87.sign(fromHex(args[1]!), secretKey, { extraEntropy: false }));
    break;
  }
  case 'verify': {
    let ok = false;
    try {
      ok = ml_dsa87.verify(fromHex(args[1]!), fromHex(args[2]!), fromHex(args[0]!));
    } catch {
      ok = false; // mirror the precompile: malformed input -> false, never revert
    }
    const word = new Uint8Array(32);
    word[31] = ok ? 1 : 0;
    out(word);
    break;
  }
  case 'message': {
    // message <chainId> <registry> <action> <attester> <nonce> <deadline> <reportHash> <passed,failed,skipped,unsupported> <uri>
    const { signingMessage, publishPayload } = await import('./chain/registry.ts');
    const [chainId, registry, action, attester, nonce, deadline, reportHash, counts, uri] = args as [string, `0x${string}`, string, `0x${string}`, string, string, `0x${string}`, string, string];
    const [passed, failed, skipped, unsupported] = counts.split(',').map(Number) as [number, number, number, number];
    const payload = publishPayload(reportHash, { passed, failed, skipped, unsupported }, uri);
    out(signingMessage({ chainId: BigInt(chainId), registry }, Number(action), attester, BigInt(nonce), BigInt(deadline), payload));
    break;
  }
  default:
    process.stderr.write(`unknown ffi command: ${cmd}\n`);
    process.exit(1);
}
