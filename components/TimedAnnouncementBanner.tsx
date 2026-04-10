import { Megaphone } from 'lucide-react';

/** Visible until this instant (5:00 PM US Pacific on April 13, 2026; April uses PDT, −07:00). */
const BANNER_END = new Date('2026-04-13T17:00:00-07:00');

export default function TimedAnnouncementBanner() {
  const now = new Date();

  if (now > BANNER_END) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-md">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Megaphone className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-base mb-1">
              Season 13 Pass+ Giveaway
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              Thanks to Blizzard, I&apos;m giving away{' '}
              <span className="font-medium text-gray-200">3 codes</span> in my{' '}
              <a
                href="https://discord.gg/TsSswU76"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-blue-400 underline decoration-blue-500/50 underline-offset-2 transition-colors hover:text-blue-300 hover:decoration-blue-400/60"
              >
                Discord
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
