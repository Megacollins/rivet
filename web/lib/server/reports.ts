import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { reportHash, type Report } from '@rivet/engine';

/**
 * Reports live in <repo>/reports (shared with the CLI). Published reference reports are committed
 * under <repo>/reports/examples, so a read-only hosted deployment can still serve them.
 * The working directory differs between `next dev` (web/) and serverless hosting, so try both layouts.
 */
function reportsRoot(): string {
  if (process.env.RIVET_REPORTS_DIR) return process.env.RIVET_REPORTS_DIR;
  const candidates = [path.resolve(/*turbopackIgnore: true*/ process.cwd(), '..', 'reports'), path.resolve(/*turbopackIgnore: true*/ process.cwd(), 'reports')];
  return candidates.find((d) => existsSync(/*turbopackIgnore: true*/ d)) ?? candidates[0]!;
}
export const REPORTS_DIR = reportsRoot();
const READ_DIRS = [REPORTS_DIR, path.join(/*turbopackIgnore: true*/ REPORTS_DIR, 'examples')];

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isReportId = (id: string) => ID.test(id);

export interface ReportListItem {
  runId: string;
  createdAt: string;
  hash: `0x${string}`;
  summary: Report['summary'];
  suites: string[];
  blockNumber?: string;
}

async function fileFor(id: string): Promise<string | undefined> {
  for (const d of READ_DIRS) {
    const p = path.join(/*turbopackIgnore: true*/ d, `${id}.json`);
    if (existsSync(/*turbopackIgnore: true*/ p)) return p;
  }
  return undefined;
}

export async function listReports(): Promise<ReportListItem[]> {
  const seen = new Map<string, ReportListItem>();
  for (const dir of READ_DIRS) {
    let files: string[] = [];
    try { files = await readdir(/*turbopackIgnore: true*/ dir); } catch { continue; }
    for (const f of files) {
      const id = f.replace(/\.json$/, '');
      if (!f.endsWith('.json') || !isReportId(id) || seen.has(id)) continue;
      try {
        const r = JSON.parse(await readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ dir, f), 'utf8')) as Report;
        seen.set(id, { runId: r.runId, createdAt: r.createdAt, hash: reportHash(r), summary: r.summary, suites: Object.keys(r.summary.bySuite), blockNumber: r.network.blockNumber });
      } catch { /* skip unreadable file */ }
    }
  }
  return [...seen.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function readReport(id: string): Promise<Report | undefined> {
  if (!isReportId(id)) return undefined;
  const p = await fileFor(id);
  if (!p) return undefined;
  try { return JSON.parse(await readFile(/*turbopackIgnore: true*/ p, 'utf8')) as Report; } catch { return undefined; }
}

/** Returns false when the filesystem is read-only (e.g. serverless hosting); the report is still returned to the client. */
export async function saveReport(r: Report): Promise<boolean> {
  try {
    await mkdir(/*turbopackIgnore: true*/ REPORTS_DIR, { recursive: true });
    await writeFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ REPORTS_DIR, `${r.runId}.json`), JSON.stringify(r, null, 2));
    return true;
  } catch {
    return false;
  }
}

export async function findReportByHash(hash: string): Promise<Report | undefined> {
  for (const item of await listReports()) if (item.hash === hash) return readReport(item.runId);
  return undefined;
}
