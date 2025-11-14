'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { Heart, Newspaper, HelpCircle, Trophy } from 'lucide-react';

export default function NavBar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [leaderboardUrl, setLeaderboardUrl] = useState('/lb/all?mode=solo');
  const supportRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  // Helper to get the current leaderboard URL from localStorage
  function getLeaderboardUrlFromStorage() {
    const storedRegion = localStorage.getItem('preferredRegion') || 'all';
    const storedGameMode = localStorage.getItem('preferredGameMode') || 'solo';
    return `/lb/${storedRegion}?mode=${storedGameMode}`;
  }

  useEffect(() => {
    setLeaderboardUrl(getLeaderboardUrlFromStorage());
    
    // Listen for storage events from other tabs/windows
    function handleStorage(e: StorageEvent) {
      if (e.key === 'preferredRegion' || e.key === 'preferredGameMode') {
        setLeaderboardUrl(getLeaderboardUrlFromStorage());
      }
    }
    
    // Listen for custom events from same tab
    function handleLocalStorageChange() {
      setLeaderboardUrl(getLeaderboardUrlFromStorage());
    }
    
    // Poll for localStorage changes (fallback for same-tab updates)
    const interval = setInterval(() => {
      const currentUrl = getLeaderboardUrlFromStorage();
      if (currentUrl !== leaderboardUrl) {
        setLeaderboardUrl(currentUrl);
      }
    }, 100);
    
    window.addEventListener('storage', handleStorage);
    window.addEventListener('localStorageChange', handleLocalStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('localStorageChange', handleLocalStorageChange);
      clearInterval(interval);
    };
  }, [leaderboardUrl]);

  // Click outside to close support/help dropdowns
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        supportRef.current &&
        !supportRef.current.contains(e.target as Node) &&
        isSupportOpen
      ) {
        setIsSupportOpen(false);
      }
      if (
        helpRef.current &&
        !helpRef.current.contains(e.target as Node) &&
        isDropdownOpen
      ) {
        setIsDropdownOpen(false);
      }
    }
    if (isSupportOpen || isDropdownOpen) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isSupportOpen, isDropdownOpen]);

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 relative">
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center space-x-3">
              <Image
                src="/android-chrome-192x192.png"
                width={64}
                height={64}
                alt="wallii Logo"
                className="rounded-lg"
              />
            </Link>
          </div>
          
          <div className="hidden xl:block absolute left-1/2 -translate-x-1/2 font-bold text-center text-2xl text-zinc-300 whitespace-nowrap">
            The Hearthstone Battlegrounds Hub
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={leaderboardUrl}
              className="p-2 bg-gray-800 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold"
              aria-label="Leaderboard"
            >
              <Trophy className="w-5 h-5" />
              <div className="hidden [@media(min-width:431px)]:block">Leaderboard</div>
            </Link>
            <Link
              href="/news"
              className="p-2 bg-gray-800 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              aria-label="Latest News"
            >
              <Newspaper className="w-5 h-5" />
              <div className="hidden [@media(min-width:431px)]:block">News</div>
            </Link>
            <div
              className="relative"
              ref={supportRef}
              onClick={() => setIsSupportOpen(!isSupportOpen)}
              onMouseEnter={() => setIsSupportOpen(true)}
              onMouseLeave={() => setIsSupportOpen(false)}
            >
              <button
                className="p-2 bg-gray-800 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                aria-label="Support Wallii"
                type="button"
                tabIndex={0}
              >
                <Heart className="w-5 h-5" />
                <div className="hidden [@media(min-width:431px)]:block">Support</div>
              </button>
              {isSupportOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 z-10 bg-gray-800 rounded-lg shadow-lg py-2 w-32">
                  <a
                    href="https://patreon.com/wallii"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-2 text-gray-300 hover:bg-blue-700 hover:text-white transition-colors"
                  >
                    <Heart className="w-5 h-5 mr-2" />
                    Patreon
                  </a>
                  <a
                    href="https://www.paypal.com/donate/?hosted_button_id=TBGLAGYRPHLEY"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-2 text-gray-300 hover:bg-blue-700 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72c.162-.717.79-1.22 1.519-1.22h7.014c3.653 0 6.16 2.516 5.946 5.98-.242 3.946-3.256 6.143-6.82 6.143h-2.652l-1.098 5.985a.64.64 0 0 1-.633.729H7.076zm6.224-16.23h-5.34l-2.35 13.515h1.543l.96-5.24a.64.64 0 0 1 .63-.528h1.616c2.766 0 5.126-1.678 5.312-4.734.168-2.765-1.901-3.014-2.37-3.014z"/>
                    </svg>
                    PayPal
                  </a>
                  <a
                    href="https://www.twitch.tv/liihs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-2 text-gray-300 hover:bg-blue-700 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.64 5.93h1.43v4.28h-1.43m3.93-4.28H17v4.28h-1.43M7 2L3.43 5.57v12.86h4.28V22l3.58-3.57h2.85L20.57 12V2m-1.43 9.29l-2.85 2.85h-2.86l-2.5 2.5v-2.5H7.71V3.43h11.43Z"/>
                    </svg>
                    Twitch
                  </a>
                  <a
                    href="https://discord.com/invite/XGZg7PEn9B"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-2 text-gray-300 hover:bg-blue-700 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12z"/>
                    </svg>
                    Discord
                  </a>
                  <a
                    href="https://x.com/lii_hs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-2 text-gray-300 hover:bg-blue-700 hover:text-white transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5 mr-2"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M4.25 3h5.516l3.7 5.03L17.5 3h2.73l-6.08 7.34L21 21h-5.516l-4.038-5.487L7.5 21H4.75l6.4-7.742L4.25 3z"
                      />
                    </svg>
                    X
                  </a>
                  <a
                    href="https://github.com/JimLiu0/wall-lii-app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-2 text-gray-300 hover:bg-blue-700 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.38 7.84 10.9.57.1.78-.25.78-.55v-1.94c-3.19.69-3.87-1.54-3.87-1.54-.52-1.31-1.27-1.66-1.27-1.66-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.19 1.75 1.19 1.02 1.75 2.68 1.24 3.34.94.1-.74.4-1.24.72-1.52-2.55-.3-5.23-1.27-5.23-5.64 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.45.11-3.03 0 0 .97-.31 3.19 1.17a11.04 11.04 0 0 1 5.8 0c2.22-1.48 3.18-1.17 3.18-1.17.63 1.58.24 2.74.12 3.03.74.8 1.18 1.82 1.18 3.07 0 4.39-2.69 5.34-5.25 5.63.42.36.77 1.06.77 2.14v3.17c0 .31.2.66.79.55A10.52 10.52 0 0 0 23.5 12c0-6.35-5.15-11.5-11.5-11.5z"/>
                    </svg>
                    GitHub
                  </a>
                </div>
              )}
            </div>
            <div
              className="relative"
              ref={helpRef}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              onMouseEnter={() => setIsDropdownOpen(true)}
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              <button
                className="p-2 bg-gray-800 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                aria-label="Help menu"
                type="button"
                tabIndex={0}
              >
                <HelpCircle className="w-5 h-5" />
                <div className="hidden [@media(min-width:431px)]:block">Help</div>
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 md:left-1/2 md:-translate-x-1/2 w-42 bg-gray-800 rounded-lg shadow-lg py-2 z-10">
                  <Link
                    href="/about"
                    className="flex items-center px-4 py-2 text-gray-300 hover:bg-blue-700 hover:text-white transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <HelpCircle className="w-5 h-5 mr-2" />
                    About
                  </Link>
                  <Link
                    href="/help"
                    className="flex items-center px-4 py-2 text-gray-300 hover:bg-blue-700 hover:text-white transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <HelpCircle className="w-5 h-5 mr-2" />
                    Help
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 