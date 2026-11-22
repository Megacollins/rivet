import type { Metadata } from 'next';

export const metadata: Metadata = { title: { default: 'Reports', template: '%s · Rivet' } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
