#!/usr/bin/env node
/**
 * rivet run [--offline] [--suites interop,determinism,attack,replay] [--out reports]
 * rivet hash <report.json>
 * rivet publish <report.json> [--uri <uri>]       (needs RIVET_OPERATOR_KEY, RIVET_PQC_SEED, RIVET_REGISTRY + open EVM window)
 * rivet verify <reportId> [--file <report.json>]  (independent verification; read-only)
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Suite } from './types.ts';
import { runAll, replayConfigFromEnv } from './runner.ts';
import { reportHash } from './report/canonical.ts';
import type { Report } from './report/report.ts';

for (const p of ['.env', '../.env']) if (existsSync(p)) process.loadEnvFile(p);

const [cmd, ...rest] = process.argv.slice(2);
const flag = (name: string) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? (rest[i + 1] ?? '') : undefined;
};
const has = (name: string) => rest.includes(`--${name}`);
const c = { g: (s: string) => `\x1b[32m${s}\x1b[0m`, r: (s: string) => `\x1b[31m${s}\x1b[0m`, y: (s: string) => `\x1b[33m${s}\x1b[0m`, d: (s: string) => `\x1b[2m${s}\x1b[0m` };

async function cmdRun() {
  const suites = flag('suites')?.split(',') as Suite[] | undefined;
  const report = await runAll({ suites, offline: has('offline'), replay: replayConfigFromEnv(), onProgress: (m) => console.log(c.d(m)) });
  const outDir = resolve(flag('out') ?? 'reports');
  await mkdir(outDir, { recursive: true });
  const file = join(outDir, `${report.runId}.json`);
  await writeFile(file, JSON.stringify(report, null, 2));

  for (const r of report.results) {
    const mark = r.status === 'pass' ? c.g('PASS') : r.status === 'fail' ? c.r(r.critical ? 'FAIL!' : 'FAIL') : c.y(r.status === 'skipped' ? 'SKIP' : 'UNSP');
    console.log(`${mark.padEnd(14)} ${r.suite.padEnd(12)} ${r.name}${r.vector ? c.d(` [${r.vector}]`) : ''} ${c.d(`→ ${r.verifier}: ${r.actual}`)}`);
  }
  const s = report.summary;
  console.log(`\n${s.total} tests: ${c.g(`${s.passed} passed`)}, ${s.failed ? c.r(`${s.failed} failed`) : '0 failed'} (${s.critical} critical), ${s.skipped} skipped, ${s.unsupported} unsupported`);
  console.log(`report  ${file}\nhash    ${reportHash(report)}`);
  if (s.failed) process.exitCode = 1;
}

async function loadReport(path: string): Promise<Report> {
  return JSON.parse(await readFile(path, 'utf8')) as Report;
}

async function cmdHash() {
  console.log(reportHash(await loadReport(rest[0]!)));
}

async function cmdPublish() {
  const { publishReport } = await import('./chain/publish.ts');
  const report = await loadReport(rest[0]!);
  const res = await publishReport(report, flag('uri') ?? `rivet://report/${report.runId}`);
  console.log(JSON.stringify(res, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
}

async function cmdVerify() {
  const { verifyPublished } = await import('./chain/verify.ts');
  const id = BigInt(rest[0]!);
  const file = flag('file');
  const res = await verifyPublished(id, file ? await loadReport(file) : undefined);
  for (const ch of res.checks) console.log(`${ch.ok ? c.g('✓') : c.r('✗')} ${ch.name}${ch.detail ? c.d(` — ${ch.detail}`) : ''}`);
  console.log(res.ok ? c.g('\nAttestation independently verified.') : c.r('\nVerification FAILED.'));
  if (!res.ok) process.exitCode = 1;
}

const commands: Record<string, () => Promise<void>> = { run: cmdRun, hash: cmdHash, publish: cmdPublish, verify: cmdVerify };
const fn = commands[cmd ?? ''];
if (!fn) {
  console.log('usage: rivet <run|hash|publish|verify> …');
  process.exitCode = 2;
} else {
  await fn();
}
