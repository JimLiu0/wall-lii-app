'use client';

import { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Copy, Check } from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';
import { buttonVariants } from './ui/button';
import { trackEvent } from '@/lib/analytics';

interface CopyButtonProps {
  text: string;
  label?: string;
  ariaLabel?: string;
  analyticsSurface?: string;
  analyticsTarget?: string;
  variant?: VariantProps<typeof buttonVariants>['variant'];
  size?: VariantProps<typeof buttonVariants>['size'];
  showCopiedPreview?: boolean;
  className?: string;
}

function getCopiedPreview(text: string) {
  try {
    const url = new URL(text, typeof window !== 'undefined' ? window.location.origin : 'https://wallii.gg');
    return `${url.pathname}${url.search}`;
  } catch {
    return text;
  }
}

export default function CopyButton({
  text,
  label,
  ariaLabel,
  analyticsSurface,
  analyticsTarget,
  variant = 'secondary',
  size = 'icon',
  showCopiedPreview = false,
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const copiedPreview = useMemo(() => getCopiedPreview(text), [text]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    trackEvent({
      eventName: 'share_copy',
      surface: analyticsSurface,
      target: analyticsTarget,
    });
  };

  return (
    <Button
      onClick={handleCopy}
      variant={copied ? 'success' : variant}
      size={size}
      className={className}
      aria-label={copied ? 'Copied' : (ariaLabel ?? label ?? 'Copy')}
    >
      {copied ? <Check /> : <Copy />}
      {label ? <span>{copied ? 'Copied' : label}</span> : null}
      {copied && showCopiedPreview ? (
        <span
          className="max-w-[42vw] truncate font-mono text-[0.6875rem] font-normal opacity-85 sm:max-w-56"
          title={copiedPreview}
        >
          {copiedPreview}
        </span>
      ) : null}
    </Button>
  );
} 
