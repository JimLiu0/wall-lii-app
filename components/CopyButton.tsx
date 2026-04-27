'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Copy, Check } from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';
import { buttonVariants } from './ui/button';

interface CopyButtonProps {
  text: string;
  label?: string;
  ariaLabel?: string;
  variant?: VariantProps<typeof buttonVariants>['variant'];
  size?: VariantProps<typeof buttonVariants>['size'];
}

export default function CopyButton({
  text,
  label,
  ariaLabel,
  variant = 'secondary',
  size = 'icon',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      onClick={handleCopy}
      variant={copied ? 'success' : variant}
      size={size}
      aria-label={copied ? 'Copied' : (ariaLabel ?? label ?? 'Copy')}
    >
      {copied ? <Check /> : <Copy />}
      {label ? <span>{copied ? 'Copied' : label}</span> : null}
    </Button>
  );
} 