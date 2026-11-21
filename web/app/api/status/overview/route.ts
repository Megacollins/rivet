import { json } from '@/lib/json';
import { CACHE, overview } from '@/lib/server/status';

export const dynamic = 'force-dynamic';

/** Local facts only (implementations, saved reports, operator mode): no network calls. */
export async function GET() {
  return json(await overview(), { headers: CACHE });
}
