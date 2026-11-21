import { DIANA, publishReport, registryAddress } from '@rivet/engine';
import { evmToQor } from '@qorechain/sdk';
import { json } from '@/lib/json';
import { readReport } from '@/lib/server/reports';
import { currentJob, operatorMode, tryLock, unlock } from '@/lib/server/operator';

export const dynamic = 'force-dynamic';

const OPEN_HINT = 'open one with: node engine/scripts/qore.ts window --blocks 2400 --txs 5 --max-value 3000000 --targets <registry>';

async function evmWindow(): Promise<{ ok: true } | { ok: false; reason: string }> {
  const registry = registryAddress()!.toLowerCase();
  try {
    const r = await fetch(`${DIANA.rest}/qorechain/pqc/v1/evm_window/${evmToQor(process.env.RIVET_ATTESTER!)}`, { cache: 'no-store' });
    const w = (await r.json()) as { live?: boolean; remaining_txs?: string; native_only?: boolean; allowed_targets?: string[] };
    if (!w.live) return { ok: false, reason: `the operator has no live EVM window, so QoreChain would refuse the transaction; ${OPEN_HINT}` };
    if (Number(w.remaining_txs ?? 0) < 1) return { ok: false, reason: `the operator's EVM window has no transactions left; ${OPEN_HINT}` };
    if (w.native_only) return { ok: false, reason: 'the operator\'s EVM window is native-only and cannot call the registry' };
    const targets = (w.allowed_targets ?? []).map((t) => t.toLowerCase());
    if (targets.length > 0 && !targets.includes(registry)) return { ok: false, reason: 'the operator\'s EVM window is scoped to other contracts, not this registry' };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: `could not read the operator's EVM window: ${(e as Error).message}` };
  }
}
export const maxDuration = 120;

/**
 * Publishes a stored report's attestation to RivetRegistry. Operator mode only.
 * The EVM tx is ECDSA-signed by the operator; QoreChain admits it only inside the
 * operator's open EVM window. The attestation itself is ML-DSA-87, checked on-chain by pqcVerify.
 */
export async function POST(_req: Request, ctx: RouteContext<'/api/reports/[id]/publish'>) {
  const op = operatorMode();
  if (!op.enabled) return json({ error: `publishing disabled: ${op.reason}` }, { status: 403 });
  const { id } = await ctx.params;
  const report = await readReport(id);
  if (!report) return json({ error: 'not found' }, { status: 404 });

  // QoreChain admits the operator's ECDSA-signed tx only inside a live EVM window that allows the registry.
  // Check it first so the user gets a clear reason instead of a chain refusal (pqc code 26/27).
  const w = await evmWindow();
  if (!w.ok) return json({ error: w.reason }, { status: 409 });

  if (!tryLock('publish')) return json({ error: `busy: a ${currentJob()} is already in progress` }, { status: 429 });
  try {
    return json(await publishReport(report, `rivet:report/${report.runId}`));
  } catch (e) {
    return json({ error: (e as Error).message.split('\n').slice(0, 3).join(' ') }, { status: 502 });
  } finally {
    unlock();
  }
}
