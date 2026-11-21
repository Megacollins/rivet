import { registryAddress } from '@rivet/engine';
import { json } from '@/lib/json';
import { CACHE, registryStatus, withTimeout } from '@/lib/server/status';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = await withTimeout<object>(registryStatus(), 25_000, () => ({ configured: true, address: registryAddress(), error: 'the Diana RPC did not answer within 25 s' }));
  return json({ ...status, checkedAt: new Date().toISOString() }, { headers: CACHE });
}
