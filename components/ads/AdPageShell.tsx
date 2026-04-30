'use client';

import type { CSSProperties, ReactNode } from 'react';

import { adSlots } from '@/components/ads/adSlots';
import GoogleAd from '@/components/ads/GoogleAd';
import { cn } from '@/lib/utils';

interface AdPageShellProps {
  children: ReactNode;
  topSlot?: string;
  leftRailSlot?: string;
  rightRailSlot?: string;
  contentMaxWidth?: string;
  className?: string;
  contentClassName?: string;
  topAdClassName?: string;
  showTopAd?: boolean;
}

export default function AdPageShell({
  children,
  topSlot,
  leftRailSlot = adSlots.sideRail,
  rightRailSlot = adSlots.sideRail,
  contentMaxWidth = '80rem',
  className,
  contentClassName,
  topAdClassName,
  showTopAd = true,
}: AdPageShellProps) {
  const showDevPlaceholder = process.env.NODE_ENV !== 'production';
  const showSideRails = Boolean(leftRailSlot || rightRailSlot || showDevPlaceholder);
  const showTop = showTopAd && Boolean(topSlot || showDevPlaceholder);

  return (
    <div
      className={cn(
        'mx-auto grid w-full gap-4 px-0 py-4 [@media(min-width:431px)]:px-4',
        showSideRails
          ? 'xl:max-w-[calc(var(--content-max-width)+22rem)] xl:grid-cols-[10rem_minmax(0,var(--content-max-width))_10rem]'
          : 'max-w-[var(--content-max-width)]',
        className
      )}
      style={{ '--content-max-width': contentMaxWidth } as CSSProperties}
    >
      {showSideRails && (
        <div className="hidden xl:block">
          <GoogleAd
            slot={leftRailSlot}
            format="vertical"
            lazy
            className="sticky top-20"
            reservedHeightClassName="min-h-[600px]"
          />
        </div>
      )}

      <div className={cn('min-w-0', contentClassName)}>
        <div className="flex flex-col stack-compact">
          {showTop && (
            <GoogleAd
              slot={topSlot}
              className={cn('hidden md:block', topAdClassName)}
              reservedHeightClassName="min-h-[90px]"
            />
          )}
          {children}
        </div>
      </div>

      {showSideRails && (
        <div className="hidden xl:block">
          <GoogleAd
            slot={rightRailSlot}
            format="vertical"
            lazy
            className="sticky top-20"
            reservedHeightClassName="min-h-[600px]"
          />
        </div>
      )}
    </div>
  );
}
