import { Suspense } from 'react';
import { Metadata } from 'next';
import HomeContent from '@/components/HomeContent';

export const metadata: Metadata = {
  title: 'Hearthstone Battlegrounds Leaderboard | Wallii',
  description: 'View hearthstone battlegrounds leaderboard rankings for all regions in Wallii',
};

export default async function HomePage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-4">
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="text-2xl font-bold text-white mb-4 text-center">Loading...</div>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
