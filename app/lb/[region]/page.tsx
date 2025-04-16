import { Suspense } from 'react';
import LeaderboardContent from '@/components/LeaderboardContent';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface PageParams {
  region: string;
}

const validRegions = ['na', 'eu', 'ap', 'cn'];
const regionNames = {
  na: 'North America',
  eu: 'Europe',
  ap: 'Asia Pacific',
  cn: 'China'
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

export default async function RegionPage({ params }: { params: Promise<PageParams> }) {
  const resolvedParams = await params;
  const region = resolvedParams.region.toLowerCase();
  
  if (!validRegions.includes(region)) {
    notFound();
  }

  return (
    <Suspense fallback={
      <div className="container mx-auto p-4">
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="text-2xl font-bold text-white mb-4 text-center">Loading...</div>
        </div>
      </div>
    }>
      <LeaderboardContent region={region} />
    </Suspense>
  );
} 