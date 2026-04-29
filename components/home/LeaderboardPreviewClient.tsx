'use client';

import { useState } from 'react';
import SocialIndicators from '../SocialIndicators';
import DashboardCard from '@/components/shared/DashboardCard';
import { AppLink } from '@/components/ui/app-link';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const regions = [
  { code: 'all', label: 'ALL'},
  { code: 'na', label: 'NA' },
  { code: 'eu', label: 'EU' },
  { code: 'ap', label: 'AP' },
  { code: 'cn', label: 'CN' },
];

const gameModes = [
  { label: 'Solo', value: '0' as const },
  { label: 'Duo', value: '1' as const },
];

function getWallLiiLeaderboardLink(region: string, mode: string) {
  const regionLower = region.toLowerCase();
  const modeStr = mode === '1' ? 'duo' : 'solo';
  return `/lb/${regionLower}/${modeStr}`;
}

interface LeaderboardEntry {
  player_name: string;
  rating: number;
  rank: number;
  region: string;
  game_mode: string;
  original_region?: string;
}

interface ChannelEntry {
  channel: string;
  player: string;
  live: boolean;
  youtube?: string;
}

interface ChineseChannelEntry {
  player: string;
  url: string;
}

interface LeaderboardPreviewClientProps {
  fullData: LeaderboardEntry[];
  channelData: ChannelEntry[];
  chineseStreamerData: ChineseChannelEntry[];
}

export default function LeaderboardPreviewClient({
  fullData,
  channelData,
  chineseStreamerData,
}: LeaderboardPreviewClientProps) {
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedMode, setSelectedMode] = useState<'0' | '1'>('0');

  const data = fullData.filter(
    (entry) => entry.region.toLowerCase() === selectedRegion && entry.game_mode === selectedMode
  );

  return (
    <DashboardCard
      title={`${selectedRegion === 'all' ? 'Global (No CN)' : selectedRegion.toUpperCase()} Leaderboard Preview`}
      description={
        <AppLink href={getWallLiiLeaderboardLink(selectedRegion, selectedMode)}>
          Full Leaderboards →
        </AppLink>
      }
    >
      <div className="flex flex-wrap justify-center gap-2 mb-4 items-center">
        <ToggleGroup
          type="single"
          value={selectedRegion}
          onValueChange={(value) => {
            if (value) setSelectedRegion(value);
          }}
        >
          {regions.map((region) => (
            <ToggleGroupItem key={region.code} value={region.code}>
              {region.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup
          type="single"
          value={selectedMode}
          onValueChange={(value) => {
            if (value === '0' || value === '1') setSelectedMode(value);
          }}
        >
          {gameModes.map((mode) => (
            <ToggleGroupItem key={mode.value} value={mode.value}>
              {mode.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>Player</TableHead>
            <TableHead>Rating</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow hover="none">
              <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                No data found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((entry) => (
              <TableRow key={entry.player_name + entry.rank}>
                <TableCell variant="emphasis">#{entry.rank}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <AppLink
                      href={`/stats/${entry.player_name}?region=${selectedRegion}&mode=${selectedMode === '0' ? 'solo' : 'duo'}`}
                      prefetch={false}
                    >
                      {entry.player_name}{' '}
                      {entry.original_region && (
                        <span className="text-sm text-muted-foreground">({entry.original_region})</span>
                      )}
                    </AppLink>
                    <SocialIndicators
                      playerName={entry.player_name}
                      channelData={channelData}
                      chineseStreamerData={chineseStreamerData}
                    />
                  </div>
                </TableCell>
                <TableCell variant="emphasis">{entry.rating}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </DashboardCard>
  );
}
