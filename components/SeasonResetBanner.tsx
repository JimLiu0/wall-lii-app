import { AlertTriangle } from 'lucide-react';

export default function SeasonResetBanner() {
  // Set the start date for the banner (adjust this to when you want it to start showing)
  const bannerStartDate = new Date('2025-12-02'); // Adjust this date as needed
  const bannerEndDate = new Date(bannerStartDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later
  const now = new Date();

  // Only show banner if we're within the 7-day window
  if (now < bannerStartDate || now > bannerEndDate) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="bg-gradient-to-r from-orange-900/80 to-red-900/80 border border-orange-700/50 rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-base mb-1">
              Season 11 Database Reset
            </h3>
            <p className="text-orange-100 text-sm leading-relaxed">
              Season 12 of Battlegrounds has started, so Wallii&apos;s database has been reset. 
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 