import LeaderboardContent from '@/components/LeaderboardContent';
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
      title: 'Region Not Found | Wall-lii',
      description: 'This region does not exist in Wall-lii'
    };
  }

  const regionName = regionNames[region as keyof typeof regionNames];
  return {
    title: `${regionName} Leaderboard | Wall-lii`,
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

  const regionName = regionNames[region as keyof typeof regionNames];

  return (
    <div className="min-h-screen bg-gray-950">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-900 rounded-lg p-4 mb-6">
            <h1 className="text-2xl font-semibold text-white mb-2 text-center">{regionName} Top 1000 Leaderboard</h1>
            <p className="text-gray-400 text-sm mb-4">
              {region === 'all'
                ? 'View top Hearthstone Battlegrounds players across all regions. Stay updated with live rankings and global trends.'
                : `Track ${regionName} player rankings in Hearthstone Battlegrounds. Live ratings and region-specific performance trends.`}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-800 rounded-lg p-3">
                <h2 className="text-white font-medium mb-1">Real-time Updates</h2>
                <p className="text-gray-400">
                  Rankings are refreshed every 5 minutes from 
                  <Link href="https://hearthstone.blizzard.com/en-us/community/leaderboards?region=US&leaderboardId=battlegrounds" className="text-blue-500 hover:text-blue-600"> the official leaderboards</Link>.
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <h2 className="text-white font-medium mb-1">Player Insights</h2>
                <p className="text-gray-400">
                  Explore rating history, trends, and player-specific statistics.
                </p>
              </div>
            </div>
          </div>
          <LeaderboardContent region={region} searchParams={resolvedSearchParams} />
        </div>
      </main>
    </div>
  );
} 