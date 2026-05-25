'use client';

import type { CSSProperties, ReactNode } from 'react';

import GoogleAd from '@/components/ads/GoogleAd';
import { cn } from '@/lib/utils';

interface AdPageShellProps {
  children: ReactNode;
  topSlot?: string;
  contentMaxWidth?: string;
  className?: string;
  contentClassName?: string;
  topAdClassName?: string;
  showTopAd?: boolean;
}

export default function AdPageShell({
  children,
  topSlot,
  contentMaxWidth = '80rem',
  className,
  contentClassName,
  topAdClassName,
  showTopAd = true,
}: AdPageShellProps) {
  const showDevPlaceholder = process.env.NODE_ENV !== 'production';
  const showTop = showTopAd && Boolean(topSlot || showDevPlaceholder);

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[var(--content-max-width)] gap-4 px-0 py-4 [@media(min-width:431px)]:px-4',
        className
      )}
      style={{ '--content-max-width': contentMaxWidth } as CSSProperties}
    >
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
    </div>
  );
}
