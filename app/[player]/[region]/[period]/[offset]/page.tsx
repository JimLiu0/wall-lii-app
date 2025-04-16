import { redirect } from 'next/navigation';

interface PageParams {
  player: string;
  region: string;
  period: string;
  offset: string;
}

interface PageProps {
  params: Promise<PageParams>;
}

export default async function PlayerPage({
  params,
}: PageProps) {
  const resolvedParams = await params;
  const { player, region, period, offset } = resolvedParams;
  
  // Map old period format to new format
  const periodMap: Record<string, string> = {
    's': 's',
    'w': 'w',
    'd': 'd',
    'season': 's',
    'week': 'w',
    'day': 'd'
  };

  const newPeriod = periodMap[period] || 's';
  
  redirect(`/${player}/${region.toLowerCase()}?v=${newPeriod}&o=${offset}`);
} 