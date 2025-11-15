import LeaderboardContent from '@/components/LeaderboardContent';
import NewsBanner from '@/components/NewsBanner';
import SeasonResetBanner from '@/components/SeasonResetBanner';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface PageParams {
  region: string;
  mode: string;
}

interface PageProps {
  params: Promise<PageParams>;
}

const validRegions = ['na', 'eu', 'ap', 'cn', 'all'];
const validModes = ['solo', 'duo'];
const regionNames = {
  na: 'North America',
  eu: 'Europe',
  ap: 'Asia Pacific',
  cn: 'China',
  all: 'Global'
};

const modeNames = {
  solo: 'Solo',
  duo: 'Duos'
};

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const resolvedParams = await params;
  const region = resolvedParams.region.toLowerCase();
  const mode = resolvedParams.mode.toLowerCase();
  
  if (!validRegions.includes(region) || !validModes.includes(mode)) {
    return {
      title: 'Region Not Found | Wallii',
      description: 'This region does not exist in Wallii'
    };
  }

  const regionName = regionNames[region as keyof typeof regionNames];
  const modeName = modeNames[mode as keyof typeof modeNames];
  return {
    title: `${regionName} ${modeName} Leaderboard | Wallii`,
    description: `View detailed ${regionName} ${modeName} Hearthstone Battlegrounds leaderboard rankings. Track player ratings, compare performance, and analyze trends in real-time.`,
    keywords: `hearthstone, battlegrounds, leaderboard, ${regionName.toLowerCase()}, ${modeName.toLowerCase()}, rankings, stats, hearthstone tracker, battlegrounds stats`
  };
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  const { region, mode } = resolvedParams;
  const validRegions = ['all', 'na', 'eu', 'ap', 'cn'];
  const validModes = ['solo', 'duo'];

  if (!validRegions.includes(region.toLowerCase()) || !validModes.includes(mode.toLowerCase())) {
    notFound();
  }

  const defaultSolo = mode.toLowerCase() === 'solo';

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-0 py-8 [@media(min-width:431px)]:px-4">
        <div className="max-w-4xl mx-auto">
          <SeasonResetBanner />
          <NewsBanner />
          <LeaderboardContent region={region.toLowerCase()} defaultSolo={defaultSolo} />
        </div>
      </main>
    </div>
  );
}

