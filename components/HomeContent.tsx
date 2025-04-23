'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomeContent() {
  const router = useRouter();

  useEffect(() => {
    const storedRegion = localStorage.getItem('preferredRegion');
    const storedGameMode = localStorage.getItem('preferredGameMode');

    // Only redirect if preferences exist (returning user)
    if (storedRegion && storedGameMode) {
      const url = storedRegion === 'all'
        ? `/lb/all?mode=${storedGameMode}`
        : `/lb/${storedRegion}?mode=${storedGameMode}`;
      router.push(url);
    }
  }, [router]);

  return (
    <div className="container mx-auto p-4">
      <div className="bg-gray-900 rounded-lg p-6">
        <h1 className="text-3xl font-bold text-white mb-4 text-center">Welcome to Wallii</h1>
        <p className="text-gray-300 text-center mb-6">Track Hearthstone Battlegrounds leaderboards, player stats, and stay updated with the latest news.</p>
        <div className="flex justify-center space-x-4">
          <Link href="/lb/all" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">View Leaderboard</Link>
          <Link href="/news" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">Read News</Link>
        </div>
      </div>
    </div>
  );
}