import AdPageShell from '@/components/ads/AdPageShell';
import { adSlots } from '@/components/ads/adSlots';
import DashboardCard from '@/components/shared/DashboardCard';
import ProfileHeader from './ProfileHeader';

interface PlayerNotFoundProps {
  player: string;
}

export default function PlayerNotFound({ player }: PlayerNotFoundProps) {
  return (
    <AdPageShell topSlot={adSlots.top} contentMaxWidth="80rem">
      <DashboardCard>
        <div className="flex flex-col gap-4">
          <ProfileHeader backUrl="/lb/na/solo" />
          <p className="mt-8 text-center text-2xl font-bold text-foreground">
            {`Couldn't find ${player}`}
          </p>
        </div>
      </DashboardCard>
    </AdPageShell>
  );
}
