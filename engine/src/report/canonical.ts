import { keccak256, toBytes } from 'viem';

/**
 * RFC 8785 (JSON Canonicalization Scheme) for the value shapes Rivet reports contain:
 * objects, arrays, strings, booleans, null and finite numbers. Keys are sorted by UTF-16 code units,
 * numbers/strings serialised per ECMAScript (which JCS adopts). `undefined` members are dropped.
 */
export function canonicalize(v: unknown): string {
  if (v === null || typeof v === 'boolean') return JSON.stringify(v);
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error('JCS: non-finite number');
    return JSON.stringify(v);
  }
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'bigint') throw new Error('JCS: bigint must be converted to string first');
  if (Array.isArray(v)) return `[${v.map((x) => (x === undefined ? 'null' : canonicalize(x))).join(',')}]`;
  if (typeof v === 'object') {
    const entries = Object.entries(v as Record<string, unknown>)
      .filter(([, x]) => x !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, x]) => `${JSON.stringify(k)}:${canonicalize(x)}`).join(',')}}`;
  }
  throw new Error(`JCS: unsupported type ${typeof v}`);
}

/** The report hash anchored on-chain: keccak256 over the UTF-8 canonical JSON. */
export const reportHash = (report: unknown): `0x${string}` => keccak256(toBytes(canonicalize(report)));
