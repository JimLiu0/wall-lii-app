import NewsBanner from '@/components/NewsBanner';
import LiveStreamsTable from '@/components/LiveStreamsTable';
import LeaderboardPreview from '@/components/LeaderboardPreview';

export const metadata = {
  title: 'Hearthstone Battlegrounds Leaderboard | Wallii',
  description: 'View hearthstone battlegrounds leaderboard rankings for all regions in Wallii',
};

export default function HomePage() {
  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <NewsBanner />
      <div className="bg-zinc-800 px-4 py-3 rounded-lg text-center text-zinc-300 mb-4">
        Track Battlegrounds leaderboards, stats, livestreams, and stay updated with the latest patch notes.
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-1/2">
          <LiveStreamsTable />
        </div>
        <div className="lg:w-1/2">
          <LeaderboardPreview />
        </div>
      </div>
    </div>
  );
}
