import SocialIndicators from '@/components/shared/SocialIndicators';
import StatCell from '@/components/shared/StatCell';
import ShareStatsActions from './ShareStatsActions';

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

interface Props {
  playerName: string;
  channelData: ChannelEntry[];
  chineseStreamerData: ChineseChannelEntry[];
  currentRank: number | null;
  currentRating: number;
  region: string;
  mode: 'solo' | 'duo';
  view: 'all' | 'week' | 'day';
  selectedDate?: string | null;
}

export default function ProfileInfo({
  playerName,
  channelData,
  chineseStreamerData,
  currentRank,
  currentRating,
  region,
  mode,
  view,
  selectedDate,
}: Props) {
  return (
    <div className="w-fit max-w-full inline-block">
      <div className="flex flex-row flex-wrap">
        <div className="flex min-h-14 flex-wrap items-center gap-3 rounded-md border border-border/50 bg-background/30 px-3 py-2">
          <h1 className="text-2xl font-semibold leading-tight text-foreground break-words">{playerName}</h1>
          <SocialIndicators
            playerName={playerName}
            channelData={channelData}
            chineseStreamerData={chineseStreamerData}
          />
        </div>
        <StatCell label="Rank" value={currentRank || 'N/A'} />
        <StatCell label="Rating" value={currentRating} />
        <ShareStatsActions
        playerName={playerName}
        region={region}
        mode={mode}
        view={view}
        selectedDate={selectedDate}
      />
      </div>
    </div>
  );
}
