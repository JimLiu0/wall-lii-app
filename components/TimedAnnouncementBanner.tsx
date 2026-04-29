import { Megaphone } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/** Visible until this instant (5:00 PM US Pacific on April 13, 2026; April uses PDT, −07:00). */
const BANNER_END = new Date('2026-04-13T17:00:00-07:00');

export default function TimedAnnouncementBanner() {
  const now = new Date();

  if (now > BANNER_END) {
    return null;
  }

  return (
    <Alert
      variant="info"
      className="text-center"
    >
      <AlertTitle>
        <Megaphone className="h-4 w-4 text-primary" />
        Season 13 Pass+ Giveaway
      </AlertTitle>
      <AlertDescription>
        Thanks to Blizzard, I&apos;m giving away <span className="font-medium">3 codes</span> in my{' '}
        <a
          href="https://discord.gg/TsSswU76"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-primary"
        >
          Discord
        </a>
        .
      </AlertDescription>
    </Alert>
  );
}
