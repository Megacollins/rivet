import type { MlDsaImpl } from '../types.ts';

/** An implementation Rivet knows about but cannot run in this build. Reported as `unsupported`, never faked. */
function unsupported(id: string, name: string, language: string, reason: string): MlDsaImpl {
  const fail = async (): Promise<never> => {
    throw new Error(`${name} unsupported: ${reason}`);
  };
  return {
    info: { id, name, version: 'n/a', language, backend: 'not available in this build' },
    capabilities: { keygenFromSeed: false, sign: false, hedgedSign: false, deterministicSign: false, context: false, verify: false },
    availability: async () => ({ ok: false, reason }),
    publicKeyFromSeed: fail,
    sign: fail,
    verify: fail,
  };
}

export const circl = unsupported('circl', 'Cloudflare CIRCL', 'Go', 'needs a Go toolchain to build the adapter binary; not bundled in this build');
export const liboqs = unsupported('liboqs', 'liboqs (Open Quantum Safe)', 'C', 'needs a native liboqs build; not bundled in this build');
export const bouncycastle = unsupported('bouncycastle', 'Bouncy Castle', 'Java', 'needs a JVM; not bundled in this build');
