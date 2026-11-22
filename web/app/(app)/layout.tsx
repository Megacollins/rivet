import { Sidebar } from '@/components/Sidebar';

/** The Rivet application: sidebar shell around Dashboard, labs, reports, registry and docs. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-9">
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </main>
    </div>
  );
}
