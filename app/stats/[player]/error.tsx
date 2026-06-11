'use client';

import { useEffect } from 'react';
import AdPageShell from '@/components/ads/AdPageShell';
import { adSlots } from '@/components/ads/adSlots';
import DashboardCard from '@/components/shared/DashboardCard';
import { Button } from '@/components/ui/button';

interface StatsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function StatsError({ error, reset }: StatsErrorProps) {
  useEffect(() => {
    console.error('Stats page error:', error);
  }, [error]);

  return (
    <AdPageShell topSlot={adSlots.top} contentMaxWidth="80rem">
      <DashboardCard>
        <div className="mt-8 space-y-3 text-center">
          <p className="text-2xl font-bold text-foreground">
            Stats temporarily unavailable
          </p>
          <p className="text-muted-foreground">
            Something went wrong while loading this profile. Please try again in a moment.
          </p>
          <Button variant="outline" onClick={reset}>
            Try again
          </Button>
        </div>
      </DashboardCard>
    </AdPageShell>
  );
}
