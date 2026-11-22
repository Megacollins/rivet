import { ReportView } from './ReportView';

export default async function Page({ params }: PageProps<'/reports/[id]'>) {
  const { id } = await params;
  return <ReportView id={id} />;
}
