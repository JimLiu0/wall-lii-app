'use client';

import GoogleAd from '@/components/ads/GoogleAd';
import { cn } from '@/lib/utils';

interface InlineAdProps {
  slot?: string;
  className?: string;
  mobile?: boolean;
  tabletAndBelow?: boolean;
}

export default function InlineAd({
  slot,
  className,
  mobile = true,
  tabletAndBelow = false,
}: InlineAdProps) {
  const visibilityClass = tabletAndBelow
    ? 'lg:hidden'
    : mobile
      ? undefined
      : 'hidden md:block';

  return (
    <GoogleAd
      slot={slot}
      lazy
      className={cn(visibilityClass, className)}
      reservedHeightClassName="min-h-[96px] md:min-h-[120px]"
    />
  );
}

