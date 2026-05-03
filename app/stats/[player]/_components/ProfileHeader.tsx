'use client';

import Link from 'next/link';
import PlayerSearch from '@/components/shared/PlayerSearch';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface ProfileHeaderProps {
  backUrl: string;
}

export default function ProfileHeader({ backUrl }: ProfileHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
      <Button asChild size="lg" className="h-10 whitespace-nowrap">
        <Link href={backUrl} prefetch={false}>
          <ArrowLeft />
          Back to Leaderboard
        </Link>
      </Button>
      <PlayerSearch />
    </div>
  );
}
