import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/** Hide after June 8 in case quota reset lags behind the billing cycle. */
const BANNER_END = new Date('2026-06-09T00:00:00-07:00');

export default function ServiceDisruptionBanner() {
  const now = new Date();

  if (now >= BANNER_END) {
    return null;
  }

  return (
    <Alert variant="warning" className="text-center">
      <AlertTitle>
        <AlertTriangle className="h-5 w-5" />
        Temporary Service Disruption
      </AlertTitle>
      <AlertDescription>
        Wallii has hit our database host&apos;s monthly bandwidth limit on the free plan, so
        leaderboards, player stats, and live data are unavailable right now. Everything should be
        back on <span className="font-medium">Monday, June 8</span>, when the monthly limit
        resets. There may be a short delay before everything is live again. Sorry for the
        inconvenience.
      </AlertDescription>
    </Alert>
  );
}
