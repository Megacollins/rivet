import { json } from '@/lib/json';
import { CACHE, chainStatus, overview, registryStatus } from '@/lib/server/status';

export const dynamic = 'force-dynamic';

/** Everything in one response (used by report pages). The dashboard uses the split endpoints instead. */
export async function GET() {
  const [o, chain, registry] = await Promise.all([overview(), chainStatus(), registryStatus()]);
  const implementations = o.implementations.map((i) =>
    i.availability ? i : { ...i, availability: chain.reachable && chain.precompile.acceptsValid ? { ok: true } : { ok: false, reason: chain.reachable ? 'precompile did not accept the probe' : chain.error } });
  return json({ ...o, implementations, chain, registry, checkedAt: new Date().toISOString() }, { headers: CACHE });
}
