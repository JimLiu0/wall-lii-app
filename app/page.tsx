import NewsBanner from '@/components/NewsBanner';
import SeasonResetBanner from '@/components/SeasonResetBanner';
import TimedAnnouncementBanner from '@/components/TimedAnnouncementBanner';
import LiveStreamsTable from '@/components/LiveStreamsTable';
import LeaderboardPreview from '@/components/LeaderboardPreview';
import PlayerSearch from '@/components/PlayerSearch';
import { Banner } from '@/components/ui/banner';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Hearthstone Battlegrounds Leaderboard | Wallii',
  description: 'View hearthstone battlegrounds leaderboard rankings for all regions in Wallii',
};

export default function HomePage() {
  return (
    <div className="container mx-auto py-4 px-0 max-w-7xl [@media(min-width:431px)]:px-4">
      <SeasonResetBanner />
      <TimedAnnouncementBanner />
      <NewsBanner />
      <Banner variant="neutral">
        Track Hearthstone Battlegrounds leaderboards, player stats, livestreams, and stay updated with the latest patch notes.
      </Banner>
      
      {/* Player Search Section */}
      <div className="text-center">
        <PlayerSearch />
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
