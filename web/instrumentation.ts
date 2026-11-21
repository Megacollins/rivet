// Load the repo-root .env into the Node.js server process only (see instrumentation-node.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('./instrumentation-node');
}
