import { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface StatCellProps {
  label: ReactNode;
  value: ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}

export default function StatCell({
  label,
  value,
  className,
  labelClassName,
  valueClassName,
}: StatCellProps) {
  return (
    <div
      className={cn(
        'flex min-h-14 flex-col justify-center rounded-md border border-border/50 bg-background/30 px-3 py-2',
        className
      )}
    >
      <span className={cn('text-[11px] font-medium uppercase tracking-wide text-muted-foreground', labelClassName)}>
        {label}
      </span>
      <span className={cn('text-sm font-semibold leading-tight break-words text-foreground', valueClassName)}>
        {value}
      </span>
    </div>
  );
}
