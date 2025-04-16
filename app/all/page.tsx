import { Suspense } from 'react';
import LeaderboardContent from '@/components/LeaderboardContent';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Global Hearthstone Battlegrounds Leaderboard | Wall-lii',
  description: 'View the global hearthstone battlegrounds leaderboard rankings for all regions in Wall-lii',
};

export default async function AllPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-4">
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="text-2xl font-bold text-white mb-4 text-center">Loading...</div>
        </div>
      </div>
    }>
      <LeaderboardContent region="all" defaultSolo={true} />
    </Suspense>
  );
} 