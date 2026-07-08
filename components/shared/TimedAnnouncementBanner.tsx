import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/** Visible through July 8, 2026 US Pacific while the Supabase free egress limit resets. */
const BANNER_END = new Date('2026-07-09T00:00:00-07:00');

export default function TimedAnnouncementBanner() {
  const now = new Date();

  if (now > BANNER_END) {
    return null;
  }

  return (
    <Alert
      variant="warning"
      className="text-center"
    >
      <AlertTitle>
        <AlertTriangle className="h-4 w-4" />
        Temporary Data Limit
      </AlertTitle>
      <AlertDescription>
        Wallii has hit the Supabase free egress limit. Leaderboard and stats data may be unavailable
        until the limit resets on <span className="font-medium">July 8</span>.
      </AlertDescription>
    </Alert>
  );
}
