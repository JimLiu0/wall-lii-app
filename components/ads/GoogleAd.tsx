'use client';

import { useEffect, useRef, useState } from 'react';

import { ADSENSE_CLIENT_ID } from '@/components/ads/adSlots';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface GoogleAdProps {
  slot?: string;
  className?: string;
  reservedHeightClassName?: string;
  format?: 'auto' | 'vertical';
  lazy?: boolean;
  rootMargin?: string;
}

export default function GoogleAd({
  slot,
  className,
  reservedHeightClassName = 'min-h-[96px]',
  format = 'auto',
  lazy = false,
  rootMargin = '500px 0px',
}: GoogleAdProps) {
  const containerRef = useRef<HTMLElement>(null);
  const [shouldRequestAd, setShouldRequestAd] = useState(!lazy);
  const showDevPlaceholder = process.env.NODE_ENV !== 'production' && !slot;

  useEffect(() => {
    if (!lazy || shouldRequestAd) return;

    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setShouldRequestAd(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldRequestAd(true);
        observer.disconnect();
      },
      { rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [lazy, rootMargin, shouldRequestAd]);

  useEffect(() => {
    if (!slot || !shouldRequestAd) return;

    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch (error) {
      console.warn('AdSense ad failed to initialize:', error);
    }
  }, [shouldRequestAd, slot]);

  if (!slot && !showDevPlaceholder) {
    return null;
  }

  return (
    <aside
      ref={containerRef}
      aria-label="Advertisement"
      className={cn(
        'w-full overflow-hidden text-center',
        reservedHeightClassName,
        className
      )}
    >
      {slot && shouldRequestAd ? (
        <ins
          key={slot}
          className="adsbygoogle block"
          style={{ display: 'block' }}
          data-ad-client={ADSENSE_CLIENT_ID}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      ) : showDevPlaceholder ? (
        <div className="flex h-full min-h-24 items-center justify-center text-xs text-muted-foreground">
          Manual AdSense slot not configured
        </div>
      ) : (
        <div aria-hidden className="h-full min-h-8" />
      )}
    </aside>
  );
}
