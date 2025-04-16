import { Suspense } from 'react';
import LeaderboardContent from '@/components/LeaderboardContent';

interface PageParams {
  region: string;
}

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const resolvedParams = await params;
  const { region } = resolvedParams;

  return (
    <Suspense fallback={
      <div className="container mx-auto p-4">
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="text-2xl font-bold text-white mb-4 text-center">Loading...</div>
        </div>
      </div>
    }>
      <LeaderboardContent region={region} />
    </Suspense>
  );
}