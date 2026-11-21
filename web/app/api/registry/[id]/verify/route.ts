import { publicClient, registryAbi, registryAddress, verifyPublished } from '@rivet/engine';
import { json } from '@/lib/json';
import { findReportByHash } from '@/lib/server/reports';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Server-side verification: noble + OpenSSL locally, plus the precompile and the contract on-chain. */
export async function GET(_req: Request, ctx: RouteContext<'/api/registry/[id]/verify'>) {
  const { id } = await ctx.params;
  if (!/^\d{1,9}$/.test(id) || id === '0') return json({ error: 'bad report id' }, { status: 400 });
  const registry = registryAddress();
  if (!registry) return json({ error: 'RIVET_REGISTRY is not set' }, { status: 503 });
  try {
    const stored = await publicClient.readContract({ address: registry, abi: registryAbi, functionName: 'getReport', args: [BigInt(id)] });
    const local = await findReportByHash(stored.reportHash);
    return json({ ...(await verifyPublished(BigInt(id), local)), localReport: local?.runId ?? null });
  } catch (e) {
    return json({ error: (e as Error).message.split('\n')[0] }, { status: 502 });
  }
}
