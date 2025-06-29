'use client';

import Link from 'next/link';
import PlayerSearch from './PlayerSearch';

interface PlayerHeaderProps {
  backUrl: string;
}

export default function PlayerHeader({ backUrl }: PlayerHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start gap-2">
      <Link
        href={backUrl}
        className="inline-flex items-center justify-center mt-1 text-blue-400 hover:text-blue-300 transition-colors px-3 py-2 rounded-lg hover:bg-gray-800 whitespace-nowrap"
      >
        <svg
          className="w-5 h-5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        <span>Back to Leaderboard</span>
      </Link>
      <PlayerSearch />
    </div>
  );
} 