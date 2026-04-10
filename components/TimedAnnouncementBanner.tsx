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
      <div className="bg-gradient-to-r from-sky-900/80 to-indigo-900/80 border border-sky-700/50 rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Megaphone className="w-5 h-5 text-sky-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-base mb-1">
              Season 13 Pass+ Giveaway
            </h3>
            <p className="text-white text-base font-medium leading-relaxed tracking-tight">
              Thanks to Blizzard, I&apos;m giving away{' '} 3 codes in my{' '}
              <a
                href="https://discord.gg/TsSswU76"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-amber-300 underline decoration-amber-400/80 decoration-2 underline-offset-[3px] transition-colors hover:text-amber-100 hover:decoration-amber-200"
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
