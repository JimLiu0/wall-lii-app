import AdPageShell from '@/components/ads/AdPageShell';
import { adSlots } from '@/components/ads/adSlots';
import DashboardCard from '@/components/shared/DashboardCard';
import { Button } from '@/components/ui/button';
import ProfileHeader from './ProfileHeader';

interface StatsUnavailableProps {
  player: string;
}

export default function StatsUnavailable({ player }: StatsUnavailableProps) {
  const profilePath = `/stats/${encodeURIComponent(player)}`;

  return (
    <AdPageShell topSlot={adSlots.top} contentMaxWidth="80rem">
      <DashboardCard>
        <div className="flex flex-col gap-4">
          <ProfileHeader backUrl="/lb/na/solo" />
          <div className="mt-8 space-y-3 text-center">
            <p className="text-2xl font-bold text-foreground">
              Stats temporarily unavailable
            </p>
            <p className="text-muted-foreground">
              We couldn&apos;t load {player}&apos;s profile right now. This is usually a brief
              database issue and should clear up shortly.
            </p>
            <Button asChild variant="outline">
              <a href={profilePath}>Try again</a>
            </Button>
          </div>
        </div>
      </DashboardCard>
    </AdPageShell>
  );
}
