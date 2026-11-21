import { publicClient, registryAbi, registryAddress } from '@rivet/engine';
import { json } from '@/lib/json';
import { listReports } from '@/lib/server/reports';

export const dynamic = 'force-dynamic';

/** Every report registered on-chain (read from contract storage), matched to a local report file by hash when one exists. */
export async function GET() {
  const address = registryAddress();
  if (!address) return json({ configured: false, reports: [] });
  try {
    const count = await publicClient.readContract({ address, abi: registryAbi, functionName: 'reportCount' });
    const ids = Array.from({ length: Number(count) }, (_, i) => BigInt(i + 1)).reverse().slice(0, 50);
    const stored = await Promise.all(ids.map((id) => publicClient.readContract({ address, abi: registryAbi, functionName: 'getReport', args: [id] })));
    const local = new Map((await listReports()).map((r) => [r.hash, r.runId]));
    return json({
      configured: true, address, reportCount: count,
      reports: stored.map((r, i) => ({ id: ids[i], ...r, localRunId: local.get(r.reportHash) ?? null })),
    });
  } catch (e) {
    return json({ configured: true, address, error: (e as Error).message.split('\n')[0], reports: [] }, { status: 502 });
  }
}
