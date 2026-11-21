import { reportHash } from '@rivet/engine';
import { json } from '@/lib/json';
import { readReport } from '@/lib/server/reports';

export const dynamic = 'force-dynamic';

/** The exact stored JSON. `?download=1` serves it as a file; its keccak256(JCS) hash is in x-rivet-report-hash. */
export async function GET(req: Request, ctx: RouteContext<'/api/reports/[id]'>) {
  const { id } = await ctx.params;
  const report = await readReport(id);
  if (!report) return json({ error: 'not found' }, { status: 404 });
  const download = new URL(req.url).searchParams.get('download') === '1';
  return json(report, {
    headers: {
      'x-rivet-report-hash': reportHash(report),
      ...(download ? { 'content-disposition': `attachment; filename="rivet-report-${id}.json"` } : {}),
    },
  });
}
