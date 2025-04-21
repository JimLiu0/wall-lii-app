'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomeContent() {
  const router = useRouter();

  useEffect(() => {
    // Get stored region preference or default to 'all'
    const storedRegion = localStorage.getItem('preferredRegion') || 'all';
    const storedGameMode = localStorage.getItem('preferredGameMode') || 'solo';
    
    // Store the defaults if none exist
    if (!localStorage.getItem('preferredRegion')) {
      localStorage.setItem('preferredRegion', 'all');
    }
    if (!localStorage.getItem('preferredGameMode')) {
      localStorage.setItem('preferredGameMode', 'solo');
    }

    // Redirect to the appropriate leaderboard page with game mode
    const url = storedRegion === 'all' 
      ? `/lb/all?mode=${storedGameMode}` 
      : `/lb/${storedRegion}?mode=${storedGameMode}`;
    router.push(url);
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="container mx-auto p-4">
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="text-2xl font-bold text-white mb-4 text-center">Loading...</div>
      </div>
    </div>
  );
} 