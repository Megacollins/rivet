import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { reportHash, type Report } from '@rivet/engine';

/** Reports live in <repo>/reports, shared with the CLI. */
export const REPORTS_DIR = process.env.RIVET_REPORTS_DIR ?? path.resolve(process.cwd(), '..', 'reports');

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

export async function listReports(): Promise<ReportListItem[]> {
  let files: string[] = [];
  try { files = await readdir(REPORTS_DIR); } catch { return []; }
  const items: ReportListItem[] = [];
  for (const f of files) {
    const id = f.replace(/\.json$/, '');
    if (!f.endsWith('.json') || !isReportId(id)) continue;
    try {
      const r = JSON.parse(await readFile(path.join(REPORTS_DIR, f), 'utf8')) as Report;
      items.push({ runId: r.runId, createdAt: r.createdAt, hash: reportHash(r), summary: r.summary, suites: Object.keys(r.summary.bySuite), blockNumber: r.network.blockNumber });
    } catch { /* skip unreadable file */ }
  }
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function readReport(id: string): Promise<Report | undefined> {
  if (!isReportId(id)) return undefined;
  try { return JSON.parse(await readFile(path.join(REPORTS_DIR, `${id}.json`), 'utf8')) as Report; } catch { return undefined; }
}

/** Returns false when the filesystem is read-only (e.g. serverless hosting); the report is still returned to the client. */
export async function saveReport(r: Report): Promise<boolean> {
  try {
    await mkdir(REPORTS_DIR, { recursive: true });
    await writeFile(path.join(REPORTS_DIR, `${r.runId}.json`), JSON.stringify(r, null, 2));
    return true;
  } catch {
    return false;
  }
}

export async function findReportByHash(hash: string): Promise<Report | undefined> {
  for (const item of await listReports()) if (item.hash === hash) return readReport(item.runId);
  return undefined;
}
