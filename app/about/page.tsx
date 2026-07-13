import { Metadata } from 'next';
import { AppLink } from '@/components/ui/app-link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about Wallii, your source for Hearthstone Battlegrounds leaderboard data and player statistics.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <Card className="mx-auto max-w-4xl">
          <CardHeader>
            <CardTitle>
              <h1 className="text-3xl">About Wallii</h1>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6 text-muted-foreground">
              <section>
                <h2 className="mb-3 text-2xl font-semibold text-foreground">What is Wallii?</h2>
                <p>
                  Wallii is the platform for everything Hearthstone Battlegrounds related. We collect data from various sources, format it and analyze it to make your life easier!
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-foreground">Leaderboards</h2>
                <ul className="flex list-disc flex-col gap-2 pl-6">
                  <li>Real-time leaderboard updates from all regions</li>
                  <li>Global and regional rankings for both Solo and Duo modes</li>
                  <li>Detailed player statistics and rating history</li>
                  <li>Search functionality to find specific players</li>
                  <li>Mobile-friendly interface for on-the-go access</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-foreground">News</h2>
                <ul className="flex list-disc flex-col gap-2 pl-6">
                  <li>Real-time news updates from all sources (forums, blogs, reddit, content creators)</li>
                  <li>Links to original sources</li>
                  <li>Filtered for only news related to Hearthstone Battlegrounds</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-foreground">Twitch/Discord Integration</h2>
                <ul className="flex list-disc flex-col gap-2 pl-6">
                  <li>Many of the <AppLink
                    href="/help"
                    aria-label="Help"
                  > core features </AppLink> of Wallii are available by using commands in the channels wallii is in</li>
                  <li><AppLink
                    href="/help"
                    aria-label="Help"
                  > Add Wallii to your twitch channel </AppLink></li>
                  <li><AppLink
                    href="https://discord.com/invite/XGZg7PEn9B"
                    aria-label="Lii's Discord">
                  Contact Lii</AppLink> to request discord integration</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-foreground">Contact</h2>
                <p>
                  Have questions or suggestions? We&apos;d love to hear from you! <AppLink
                    href="https://discord.com/invite/XGZg7PEn9B"
                    aria-label="Lii's Discord">
                  Contact Lii</AppLink>
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 
