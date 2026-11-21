import { json } from '@/lib/json';
import { CACHE, chainStatus, withTimeout } from '@/lib/server/status';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = await withTimeout(chainStatus(), 25_000, () => ({ reachable: false as const, error: 'the Diana RPC did not answer within 25 s' }));
  return json({ ...status, checkedAt: new Date().toISOString() }, { headers: CACHE });
}
