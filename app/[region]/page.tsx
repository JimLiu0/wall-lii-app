import { Suspense } from 'react';
import LeaderboardContent from '@/components/LeaderboardContent';
import { Metadata } from 'next';

interface PageParams {
  region: string;
}

interface PageProps {
  params: Promise<PageParams>;
}

const regionNames = {
  na: 'North America',
  eu: 'Europe',
  ap: 'Asia Pacific',
  cn: 'China'
};

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const resolvedParams = await params;
  const regionName = regionNames[resolvedParams.region as keyof typeof regionNames] || resolvedParams.region.toUpperCase();
  return {
    title: `${regionName} Leaderboard | Wall-lii`,
    description: `View the ${regionName} regional leaderboard rankings in Wall-lii`,
  };
}

export default async function LeaderboardPage({
  params,
}: PageProps) {
  const resolvedParams = await params;
  const { region } = resolvedParams;

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