import LeaderboardContent from '@/components/LeaderboardContent';
import NewsBanner from '@/components/NewsBanner';
import { Metadata } from 'next';
import Link from 'next/link';
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
      title: 'Region Not Found | Wallii',
      description: 'This region does not exist in Wallii'
    };
  }

  const regionName = regionNames[region as keyof typeof regionNames];
  return {
    title: `${regionName} Leaderboard | Wallii`,
    description: `View detailed ${regionName} Hearthstone Battlegrounds leaderboard rankings. Track player ratings, compare performance, and analyze trends in real-time.`,
    keywords: `hearthstone, battlegrounds, leaderboard, ${regionName.toLowerCase()}, rankings, stats, hearthstone tracker, battlegrounds stats`
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
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <NewsBanner />
          <LeaderboardContent region={region} searchParams={resolvedSearchParams} />
        </div>
      </main>
    </div>
  );
} 