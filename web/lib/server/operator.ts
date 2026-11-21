
/**
 * Operator mode = this server may SIGN and SEND on-chain transactions (publish reports).
 * It needs the operator's keys AND an explicit opt-in, so a hosted read-only deployment
 * can never publish by accident. Secrets are read here and never returned to clients.
 */
export function operatorMode(): { enabled: boolean; reason?: string } {
  if (process.env.RIVET_WEB_OPERATOR !== '1') return { enabled: false, reason: 'read-only deployment (RIVET_WEB_OPERATOR is not 1)' };
  if (!process.env.RIVET_OPERATOR_KEY || !process.env.RIVET_PQC_SEED) return { enabled: false, reason: 'operator keys are not configured' };
  if (!process.env.RIVET_REGISTRY) return { enabled: false, reason: 'RIVET_REGISTRY is not set' };
  return { enabled: true };
}

/** One heavy job (suite run / publish) at a time per server process. */
let busy: string | undefined;
export function tryLock(job: string): boolean {
  if (busy) return false;
  busy = job;
  return true;
}
export function unlock(): void {
  busy = undefined;
}
export const currentJob = () => busy;
