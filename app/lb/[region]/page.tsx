import { redirect } from 'next/navigation';

interface PageParams {
  region: string;
}

interface PageProps {
  params: Promise<PageParams>;
  searchParams: Promise<{ mode?: string }>;
}

const validRegions = ['na', 'eu', 'ap', 'cn', 'all'];

export default async function Page({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const { region } = resolvedParams;
  const { mode } = resolvedSearchParams;

  // Validate region
  if (!validRegions.includes(region.toLowerCase())) {
    redirect('/lb/all/solo');
  }

  // Determine mode: use query param if valid, otherwise default to 'solo'
  const validMode = mode && (mode.toLowerCase() === 'solo' || mode.toLowerCase() === 'duo')
    ? mode.toLowerCase()
    : 'solo';

  // Redirect to new path-based URL structure
  redirect(`/lb/${region.toLowerCase()}/${validMode}`);
}
