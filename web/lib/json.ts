/** JSON with bigint support (bigints become decimal strings). */
export const toJson = (v: unknown): string => JSON.stringify(v, (_, x) => (typeof x === 'bigint' ? x.toString() : x));

export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(toJson(data), { ...init, headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) } });
}
