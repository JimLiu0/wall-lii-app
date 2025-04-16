'use client';

import { useEffect, useState } from 'react';
import LeaderboardContent from './LeaderboardContent';

export default function HomeContent() {
  const [region, setRegion] = useState('all');
  const [isSolo, setIsSolo] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load preferences from localStorage
    const storedRegion = localStorage.getItem('preferredRegion');
    const storedGameMode = localStorage.getItem('preferredGameMode');
    
    if (storedRegion) {
      setRegion(storedRegion);
    }
    if (storedGameMode) {
      setIsSolo(storedGameMode === 'solo');
    }
    setIsLoaded(true);
  }, []);

  // Don't render anything until we've loaded preferences
  if (!isLoaded) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="text-2xl font-bold text-white mb-4 text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return <LeaderboardContent region={region} defaultSolo={isSolo} />;
} 