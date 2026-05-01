'use client';

import { supabase } from '@/utils/supabaseClient';

type TrackEventParams = {
  eventName: string;
  surface?: string;
  target?: string;
};

export function trackEvent({ eventName, surface, target }: TrackEventParams) {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  try {
    // Fire-and-forget analytics; UI should never wait on this.
    void (async () => {
      try {
        await supabase.from('analytics_events').insert({
          event_name: eventName,
          surface,
          target,
          path: window.location.pathname,
          user_agent: navigator.userAgent,
        });
      } catch {
        // Swallow async analytics errors.
      }
    })();
  } catch {
    // Swallow analytics errors.
  }
}
