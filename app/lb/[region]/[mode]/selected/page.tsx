import LeaderboardPage from '../_components/LeaderboardPage';

export { generateMetadata } from '../_components/LeaderboardPage';

// Internal rewrite target: public date/week links keep their original URL.
export default function Page(props: {
  params: Promise<{ region: string; mode: string }>;
  searchParams: Promise<{ view?: string; date?: string; v?: string; o?: string }>;
}) {
  return <LeaderboardPage {...props} />;
}
