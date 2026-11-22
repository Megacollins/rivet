import { Sidebar } from '@/components/Sidebar';

/** The Rivet application: sidebar (lg+) or top bar (below lg) around Dashboard, labs, reports, registry and docs. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 md:py-8 lg:px-10 lg:py-9">
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </main>
    </div>
  );
}
