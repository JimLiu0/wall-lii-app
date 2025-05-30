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
  const leaderboardLink = region == 'cn' ? 'https://hs.blizzard.cn/community/leaderboards/' : `https://hearthstone.blizzard.com/en-us/community/leaderboards?region=${region}&leaderboardId=battlegrounds${resolvedSearchParams.mode == 'duo' ? 'duo' : ''}`

  if (!validRegions.includes(region)) {
    notFound();
  }

  const regionName = regionNames[region as keyof typeof regionNames];

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center mb-4">
            <Link
              href="/news"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0l-3-3m3 3l-3 3" />
              </svg>
              Latest Battlegrounds News
            </Link>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 mb-6">
            <h1 className="text-2xl font-semibold text-white mb-2 text-center">{regionName} Top 1000 Leaderboard</h1>
            <p className="text-gray-400 text-sm text-center">
              Rankings are fetched from the 
              <Link href={leaderboardLink} className="text-blue-500 hover:text-blue-600 ml-1" target='blank'>official leaderboards </Link>
              every 5 minutes. Wallii fetches the top 1000 players in each region.
              <div className='mt-2'>All stats and resets use Pacific Time (PT) midnight as the daily/weekly reset.</div>
              {region === 'cn' && (
                <div className='mt-2'>
                  Blizzard CN only updates their leaderboards every hour.
                </div>
              )}
            </p>
          </div>
          <LeaderboardContent region={region} searchParams={resolvedSearchParams} />
        </div>
      </main>
    </div>
  );
} 