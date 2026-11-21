import { reportHash } from '@rivet/engine/canonical';

/** Recomputes a report's identity in the browser: keccak256 of its RFC 8785 canonical JSON. */
export const canonicalReportHash = (report: unknown): `0x${string}` => reportHash(report);
