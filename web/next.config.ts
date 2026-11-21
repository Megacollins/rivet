import path from 'node:path';
import type { NextConfig } from 'next';

const root = path.resolve(import.meta.dirname, '..');

const nextConfig: NextConfig = {
  // The engine ships as TypeScript source (Node runs it natively); Next compiles it for the app.
  transpilePackages: ['@rivet/engine'],
  turbopack: { root },
  outputFileTracingRoot: root,
  poweredByHeader: false,
};

export default nextConfig;
