import { json } from '@/lib/json';
import { listReports } from '@/lib/server/reports';

export const dynamic = 'force-dynamic';

export async function GET() {
  return json(await listReports());
}
