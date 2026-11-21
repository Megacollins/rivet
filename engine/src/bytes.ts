export const toHex = (b: Uint8Array): `0x${string}` => `0x${Buffer.from(b).toString('hex')}`;

export function fromHex(h: string): Uint8Array {
  const s = h.startsWith('0x') ? h.slice(2) : h;
  if (s.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(s)) throw new Error('invalid hex');
  return new Uint8Array(Buffer.from(s, 'hex'));
}

export const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);

export function flipBit(b: Uint8Array, byteIndex: number, bit = 0): Uint8Array {
  const out = new Uint8Array(b);
  const i = ((byteIndex % out.length) + out.length) % out.length;
  out[i] = out[i]! ^ (1 << bit);
  return out;
}

export const concat = (...parts: Uint8Array[]): Uint8Array => new Uint8Array(Buffer.concat(parts));

export const equal = (a: Uint8Array, b: Uint8Array): boolean => Buffer.compare(a, b) === 0;

export function errMsg(e: unknown): string {
  if (e && typeof e === 'object') {
    const o = e as { shortMessage?: string; message?: string };
    return (o.shortMessage ?? o.message ?? String(e)).split('\n')[0]!;
  }
  return String(e);
}
