import { Suspense } from 'react';
import PlayerProfile from '@/components/PlayerProfile'

interface PageParams {
  player: string;
  region: string;
  period: string;
  offset: string;
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const resolvedParams = await params;
  resolvedParams.player = decodeURIComponent(resolvedParams.player);
  const { player, region, period, offset } = resolvedParams;

  return (
    <Suspense fallback={
      <div className="container mx-auto p-4">
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="text-2xl font-bold text-white mb-4 text-center">Loading...</div>
        </div>
      </div>
    }>
      <PlayerProfile
        player={player}
        region={region}
        period={period}
        offset={offset}
      />
    </Suspense>
  );
}