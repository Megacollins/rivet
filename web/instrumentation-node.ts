import path from 'node:path';

// Server process only. Nothing here reaches the browser: no NEXT_PUBLIC_ variables are used,
// and secrets are read only inside server modules.
try {
  process.loadEnvFile(path.resolve(process.cwd(), '..', '.env'));
} catch {
  /* no root .env: read-only mode (hosted deployments set env vars directly) */
}
