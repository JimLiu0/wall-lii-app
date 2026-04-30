import NewsBanner from '@/components/NewsBanner';
import SeasonResetBanner from '@/components/SeasonResetBanner';
import TimedAnnouncementBanner from '@/components/TimedAnnouncementBanner';
import LiveStreamsTable from '@/components/home/LiveStreamsTable';
import LeaderboardPreview from '@/components/home/LeaderboardPreview';
import PlayerSearch from '@/components/shared/PlayerSearch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AdPageShell from '@/components/ads/AdPageShell';
import InlineAd from '@/components/ads/InlineAd';
import { adSlots } from '@/components/ads/adSlots';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Hearthstone Battlegrounds Leaderboard | Wallii',
  description: 'View hearthstone battlegrounds leaderboard rankings for all regions in Wallii',
};

export default function HomePage() {
  return (
    <AdPageShell topSlot={adSlots.top} contentMaxWidth="80rem">
      <div className="stack-compact">
        <SeasonResetBanner />
        <TimedAnnouncementBanner />
        <NewsBanner />
        <Alert variant="neutral" className="text-center">
          <AlertDescription>
            Track Hearthstone Battlegrounds leaderboards, player stats, livestreams, and stay updated with the latest patch notes.
          </AlertDescription>
        </Alert>
        
        {/* Player Search Section */}
        <div className="text-center">
          <PlayerSearch />
        </div>
        
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-1/2">
            <LiveStreamsTable />
          </div>
          <InlineAd slot={adSlots.inline} tabletAndBelow />
          <div className="lg:w-1/2">
            <LeaderboardPreview />
          </div>
        </div>
      </div>
    </AdPageShell>
  );
}
