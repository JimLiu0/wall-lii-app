import SocialIndicators from '../SocialIndicators';

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

export default function PlayerInfoSection({
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
        <div className="flex min-h-14 flex-col justify-center rounded-md border border-border/50 bg-background/30 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Rank</p>
          <p className="text-sm font-semibold leading-tight text-foreground">{currentRank || 'N/A'}</p>
        </div>
        <div className="flex min-h-14 flex-col justify-center rounded-md border border-border/50 bg-background/30 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Rating</p>
          <p className="text-sm font-semibold leading-tight text-foreground">{currentRating}</p>
        </div>
      </div>
    </div>
  );
}
