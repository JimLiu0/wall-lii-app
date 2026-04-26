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
    <div className="flex flex-wrap items-center gap-3">
      <h1 className="text-4xl font-bold text-foreground break-all">{playerName}</h1>
      <SocialIndicators
        playerName={playerName}
        channelData={channelData}
        chineseStreamerData={chineseStreamerData}
      />
      <div className="inline-flex items-center gap-5 rounded-lg border border-border/50 bg-card/40 px-4 py-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rank</p>
          <p className="text-xl font-semibold text-foreground">{currentRank || 'N/A'}</p>
        </div>
        <div className="h-5 w-px bg-border/60" aria-hidden="true" />
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rating</p>
          <p className="text-xl font-semibold text-foreground">{currentRating}</p>
        </div>
      </div>
    </div>
  );
}
