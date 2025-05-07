import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Wallii | Hearthstone Battlegrounds Leaderboards',
  description: 'Learn about Wallii, your source for Hearthstone Battlegrounds leaderboard data and player statistics.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-900 rounded-lg p-6">
            <h1 className="text-3xl font-bold text-white mb-6">About Wallii</h1>
            
            <div className="space-y-6 text-gray-300">
              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">What is Wallii?</h2>
                <p>
                  Wallii is the platform for everything Hearthstone Battlegrounds related. We collect data from various sources, format it and analyze it to make your life easier!
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">Leaderboards</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Real-time leaderboard updates from all regions</li>
                  <li>Global and regional rankings for both Solo and Duo modes</li>
                  <li>Detailed player statistics and rating history</li>
                  <li>Search functionality to find specific players</li>
                  <li>Mobile-friendly interface for on-the-go access</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">News</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Real-time news updates from all sources (forums, blogs, reddit, content creators)</li>
                  <li>Links to original sources</li>
                  <li>Filtered for only news related to Hearthstone Battlegrounds</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">Twitch/Discord Integration</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Many of the <a
                    className="text-blue-400 hover:text-blue-300"
                    href="/help"
                    aria-label="Help"
                  > core features </a> of Wallii are available by using commands in the channels wallii is in</li>
                  <li><a
                    className="text-blue-400 hover:text-blue-300"
                    href="/help"
                    aria-label="Help"
                  > Add Wallii to your twitch channel </a></li>
                  <li><a
                    className="text-blue-400 hover:text-blue-300"
                    href="https://discord.com/invite/XGZg7PEn9B"
                    aria-label="Lii's Discord">
                  Contact Lii</a> to request discord integration</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">Contact</h2>
                <p>
                  Have questions or suggestions? We&apos;d love to hear from you! <a
                    className="text-blue-400 hover:text-blue-300"
                    href="https://discord.com/invite/XGZg7PEn9B"
                    aria-label="Lii's Discord">
                  Contact Lii</a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 