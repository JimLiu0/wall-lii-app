'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function NavBar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center space-x-3">
              <Image
                src="/android-chrome-512x512.png"
                width={64}
                height={64}
                alt="wallii Logo"
                className="rounded-lg"
              />
            </Link>
          </div>
          
          <div className="hidden font-bold md:block max-w-4xl mx-auto text-center text-2xl text-zinc-300 mt-2">
            Your Hearthstone Battlegrounds Hub
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Link
                href="/about"
                className="p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                onClick={(e) => {
                  e.preventDefault();
                  setIsDropdownOpen(!isDropdownOpen);
                }}
                aria-label="Help menu"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.07 12.85c.77-1.39 2.25-2.21 3.11-3.44.91-1.29.4-3.7-2.18-3.7-1.69 0-2.52 1.28-2.87 2.34L6.54 6.96C7.25 4.83 9.18 3 11.99 3c2.35 0 3.96 1.07 4.78 2.41.7 1.15 1.11 3.3.03 4.9-1.2 1.77-2.35 2.31-2.97 3.45-.25.46-.35.76-.35 2.24h-2.89c-.01-.78-.13-2.05.48-3.15zM12 18c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/>
                </svg>
              </Link>
              {isDropdownOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg py-2 z-10">
                  <Link
                    href="/about"
                    className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                    </svg>
                    About
                  </Link>
                  <Link
                    href="/privacy"
                    className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                    </svg>
                    Privacy Policy
                  </Link>
                  <Link
                    href="/help"
                    className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z"/>
                    </svg>
                    Help
                  </Link>
                </div>
              )}
            </div>
            <a
              href="https://www.twitch.tv/liihs"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-[#9146FF] text-white rounded-lg hover:bg-[#9146FF]/90 transition-colors"
              aria-label="Follow on Twitch"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.64 5.93h1.43v4.28h-1.43m3.93-4.28H17v4.28h-1.43M7 2L3.43 5.57v12.86h4.28V22l3.58-3.57h2.85L20.57 12V2m-1.43 9.29l-2.85 2.85h-2.86l-2.5 2.5v-2.5H7.71V3.43h11.43Z"/>
              </svg>
            </a>
            <a
              href="https://discord.com/invite/XGZg7PEn9B"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-[#5865F2] text-white rounded-lg hover:bg-[#5865F2]/90 transition-colors"
              aria-label="Join Discord"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12z"/>
              </svg>
            </a>
            <Link
              href="https://patreon.com/wallii"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-[#FF424D] text-white rounded-lg hover:bg-[#FF424D]/90 transition-colors"
              aria-label="Support on Patreon"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.82 2.41c3.96 0 7.18 3.24 7.18 7.21 0 3.96-3.22 7.18-7.18 7.18-3.97 0-7.21-3.22-7.21-7.18 0-3.97 3.24-7.21 7.21-7.21M2 21.6h3.5V2.41H2V21.6z"/>
              </svg>
            </Link>
            <a
              href="https://www.paypal.com/donate/?hosted_button_id=TBGLAGYRPHLEY"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-[#0070BA] text-white rounded-lg hover:bg-[#0070BA]/90 transition-colors"
              aria-label="Donate with PayPal"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72c.162-.717.79-1.22 1.519-1.22h7.014c3.653 0 6.16 2.516 5.946 5.98-.242 3.946-3.256 6.143-6.82 6.143h-2.652l-1.098 5.985a.64.64 0 0 1-.633.729H7.076zm6.224-16.23h-5.34l-2.35 13.515h1.543l.96-5.24a.64.64 0 0 1 .63-.528h1.616c2.766 0 5.126-1.678 5.312-4.734.168-2.765-1.901-3.014-2.37-3.014z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
} 