import SocialIndicators from '../SocialIndicators';
import StatCell from '@/components/shared/StatCell';

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
}

export default function ProfileInfo({
  playerName,
  channelData,
  chineseStreamerData,
  currentRank,
  currentRating,
}: Props) {
  return (
    <div className="inline-block w-fit max-w-full">
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
      </div>
    </div>
  );
}
