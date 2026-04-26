"use client";

import DashboardCard from "@/components/shared/DashboardCard";
import { AppLink } from "@/components/ui/app-link";

import SocialIndicators from "@/components/SocialIndicators";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ChannelEntry {
  channel: string;
  player: string;
  live: boolean;
  youtube?: string;
}

interface ChineseStreamerEntry {
  player: string;
  url: string;
}

interface LiveStreamRow {
  player_name: string;
  rank: number;
  rating: number;
  game_mode: string;
  region: string;
}

interface LiveStreamsTableClientProps {
  rows: LiveStreamRow[];
  channelData: ChannelEntry[];
  chineseStreamerData: ChineseStreamerEntry[];
  hasLiveChannels: boolean;
}

function getModeLabel(mode: string) {
  return mode === "1" ? "Duo" : "Solo";
}

function getWallLiiLeaderboardLink(region: string, mode: string) {
  const regionLower = region.toLowerCase();
  const modeStr = mode === "1" ? "duo" : "solo";
  return `/lb/${regionLower}/${modeStr}`;
}

export default function LiveStreamsTableClient({
  rows,
  channelData,
  chineseStreamerData,
  hasLiveChannels,
}: LiveStreamsTableClientProps) {
  const isNoLiveChannels = !hasLiveChannels;

  return (
    <DashboardCard
      title="Top Ranked Livestreams"
      description={
        <AppLink href="/help" className="font-semibold">
          Add Your Twitch/Youtube →
        </AppLink>
      }
    >
      {isNoLiveChannels ? (
        <div className="py-8 text-center text-muted-foreground">
          <p className="text-lg">No streamers currently live who are on the leaderboard</p>
          <p className="mt-2 text-sm">Check back later for live streams from top players</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Region</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.player_name}>
                  <TableCell variant="emphasis">#{row.rank}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <AppLink href={`/stats/${row.player_name}`} className="font-semibold" prefetch={false}>
                        {row.player_name}
                      </AppLink>
                      <SocialIndicators
                        playerName={row.player_name}
                        channelData={channelData}
                        chineseStreamerData={chineseStreamerData}
                      />
                    </div>
                  </TableCell>
                  <TableCell variant="emphasis">{row.rating}</TableCell>
                  <TableCell className="text-left">{getModeLabel(row.game_mode)}</TableCell>
                  <TableCell className="text-left">
                    <AppLink href={getWallLiiLeaderboardLink(row.region, row.game_mode)}>
                      {row.region.toUpperCase()}
                    </AppLink>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No live streamers currently on the leaderboard
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </DashboardCard>
  );
}
