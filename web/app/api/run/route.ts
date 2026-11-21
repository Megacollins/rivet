import { reportHash, replayConfigFromEnv, runAll, type Suite } from '@rivet/engine';
import { toJson } from '@/lib/json';
import { saveReport } from '@/lib/server/reports';
import { currentJob, tryLock, unlock } from '@/lib/server/operator';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const SUITES: Suite[] = ['interop', 'determinism', 'attack', 'replay'];

/**
 * Runs engine suites and streams NDJSON: {type:'progress'} lines, then {type:'report'} or {type:'error'}.
 * Every result comes from a real implementation or the live chain; nothing here fabricates results.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { suites?: unknown; offline?: unknown };
  const suites = Array.isArray(body.suites) ? (body.suites.filter((s) => SUITES.includes(s as Suite)) as Suite[]) : SUITES;
  if (suites.length === 0) return new Response(toJson({ error: 'no valid suites' }), { status: 400 });
  if (!tryLock('run')) return new Response(toJson({ error: `busy: a ${currentJob()} is already in progress` }), { status: 429 });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (o: unknown) => ctrl.enqueue(enc.encode(toJson(o) + '\n'));
      try {
        const report = await runAll({
          suites,
          offline: body.offline === true,
          replay: replayConfigFromEnv(),
          onProgress: (message) => send({ type: 'progress', message }),
        });
        const saved = await saveReport(report);
        send({ type: 'report', report, hash: reportHash(report), saved });
      } catch (e) {
        send({ type: 'error', error: (e as Error).message.split('\n')[0] });
      } finally {
        unlock();
        ctrl.close();
      }
    },
  });
  return new Response(stream, { headers: { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store' } });
}
