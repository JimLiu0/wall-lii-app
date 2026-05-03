'use client';

import { useMemo } from 'react';
import CopyButton from '@/components/shared/CopyButton';

interface ShareStatsActionsProps {
  playerName: string;
  region: string;
  mode: 'solo' | 'duo';
  view: 'all' | 'week' | 'day';
  selectedDate?: string | null;
}

const FALLBACK_ORIGIN = 'https://wallii.gg';

export default function ShareStatsActions({
  playerName,
  region,
  mode,
  view,
  selectedDate,
}: ShareStatsActionsProps) {
  const origin = typeof window !== 'undefined' ? window.location.origin : FALLBACK_ORIGIN;
  const encodedPlayer = encodeURIComponent(playerName);

  const profileUrl = useMemo(() => {
    return `${origin}/stats/${encodedPlayer}`;
  }, [origin, encodedPlayer]);

  const currentViewUrl = useMemo(() => {
    const params = new URLSearchParams({
      region,
      mode,
      view,
    });

    if (selectedDate) {
      params.set('date', selectedDate);
    }

    return `${origin}/stats/${encodedPlayer}?${params.toString()}`;
  }, [origin, encodedPlayer, region, mode, view, selectedDate]);

  return (
    <div className="flex min-h-14 flex-wrap items-center gap-2 rounded-md border border-border/50 bg-background/30 px-3 py-2">
      <CopyButton
        text={profileUrl}
        label="Player"
        ariaLabel="Copy player profile URL"
        variant="outline"
        size="lg"
        showCopiedPreview
      />
      <CopyButton
        text={currentViewUrl}
        label="Current View"
        ariaLabel="Copy current player stats view URL"
        variant="outline"
        size="lg"
        showCopiedPreview
      />
    </div>
  );
}
