'use client';

import Link from 'next/link';

interface ChannelEntry {
  channel: string;
  player: string;
  live: boolean;
  youtube?: string;
}

interface SocialIndicatorsProps {
  playerName: string;
  channelData: ChannelEntry[];
}

export default function SocialIndicators({ playerName, channelData }: SocialIndicatorsProps) {
  // Create a map for quick channel lookups
  const channelMap = new Map(channelData.map(channel => [channel.player.toLowerCase(), channel]));
  const channel = channelMap.get(playerName.toLowerCase());
  
  if (!channel) return null;

  const twitchUrl = `https://twitch.tv/${channel.channel}`;
  const youtubeUrl = channel.youtube ? `https://youtube.com/@${channel.youtube}` : null;
  
  return (
    <div className="flex items-center gap-1">
      {channel.live ? (
        // Live indicator with red button
        <Link
          href={twitchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded transition-colors"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
          </svg>
          LIVE
        </Link>
      ) : (
        // Regular Twitch icon
        <Link
          href={twitchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-400 hover:text-purple-300 transition-colors"
          title={`${playerName}'s Twitch Channel`}
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
          </svg>
        </Link>
      )}
      
      {/* YouTube icon */}
      {youtubeUrl && (
        <Link
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-red-400 hover:text-red-300 transition-colors"
          title={`${playerName}'s YouTube Channel`}
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        </Link>
      )}
    </div>
  );
} 