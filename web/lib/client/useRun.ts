'use client';

import { useCallback, useRef, useState } from 'react';
import type { Report } from '@rivet/engine/report';
import type { Suite } from '@rivet/engine/types';

export type RunState =
  | { phase: 'idle' }
  | { phase: 'running'; log: string[] }
  | { phase: 'done'; log: string[]; report: Report; hash: string; saved: boolean }
  | { phase: 'error'; log: string[]; error: string };

/** Streams POST /api/run (NDJSON) into state. */
export function useRun() {
  const [state, setState] = useState<RunState>({ phase: 'idle' });
  const running = useRef(false);

  const run = useCallback(async (suites: Suite[], offline = false) => {
    if (running.current) return;
    running.current = true;
    const log: string[] = [];
    setState({ phase: 'running', log: [] });
    try {
      const res = await fetch('/api/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ suites, offline }) });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (!line.trim()) continue;
          const m = JSON.parse(line);
          if (m.type === 'progress') { log.push(m.message); setState({ phase: 'running', log: [...log] }); }
          else if (m.type === 'report') setState({ phase: 'done', log, report: m.report, hash: m.hash, saved: m.saved });
          else if (m.type === 'error') setState({ phase: 'error', log, error: m.error });
        }
      }
    } catch (e) {
      setState({ phase: 'error', log, error: (e as Error).message });
    } finally {
      running.current = false;
    }
  }, []);

  return { state, run };
}
