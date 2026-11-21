import path from 'node:path';
import type { NextConfig } from 'next';

const root = path.resolve(import.meta.dirname, '..');

const nextConfig: NextConfig = {
  // The engine ships as TypeScript source (Node runs it natively); Next compiles it for the app.
  transpilePackages: ['@rivet/engine'],
  turbopack: { root },
  outputFileTracingRoot: root,
  // Committed reference reports, read at runtime by the API routes on a read-only host.
  // noble's package.json is read at runtime so reports record the real installed version.
  outputFileTracingIncludes: { '/api/**': ['../reports/examples/*.json', '../node_modules/@noble/post-quantum/package.json'] },
  poweredByHeader: false,
};

export default nextConfig;
