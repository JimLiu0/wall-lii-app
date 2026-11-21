import LeaderboardPage from './_components/LeaderboardPage';

export { generateMetadata } from './_components/LeaderboardPage';

export const revalidate = 300;

// Generate on first visit, then reuse HTML/RSC output for five minutes.
export function generateStaticParams() {
  return [];
}

export default function Page({ params }: {
  params: Promise<{ region: string; mode: string }>;
}) {
  // Query-selected views are rewritten to /selected before filesystem routing.
  return <LeaderboardPage params={params} searchParams={Promise.resolve({ view: 'day' })} cachePage />;
}
