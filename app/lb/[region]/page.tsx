import LeaderboardContent from '@/components/LeaderboardContent';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface PageParams {
  region: string;
}

interface PageProps {
  params: Promise<PageParams>;
  searchParams: Promise<{ mode?: string }>;
}

const validRegions = ['na', 'eu', 'ap', 'cn', 'all'];
const regionNames = {
  na: 'North America',
  eu: 'Europe',
  ap: 'Asia Pacific',
  cn: 'China',
  all: 'Global'
};

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const resolvedParams = await params;
  const region = resolvedParams.region.toLowerCase();
  if (!validRegions.includes(region)) {
    return {
      title: 'Region Not Found | Wall-lii',
      description: 'This region does not exist in Wall-lii'
    };
  }

  const regionName = regionNames[region as keyof typeof regionNames];
  return {
    title: `${regionName} Leaderboard | Wall-lii`,
    description: `View the ${regionName} hearthstone battlegrounds leaderboard rankings in Wall-lii`,
  };
}

export default async function Page({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const { region } = resolvedParams;
  const validRegions = ['all', 'na', 'eu', 'ap', 'cn'];
  
  if (!validRegions.includes(region)) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <main className="container mx-auto px-4 py-8">
        <LeaderboardContent region={region} searchParams={resolvedSearchParams} />
      </main>
    </div>
  );
} 