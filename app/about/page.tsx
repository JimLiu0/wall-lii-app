import { Metadata } from 'next';

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
                  Wallii is a comprehensive platform for tracking Hearthstone Battlegrounds leaderboards and player statistics. 
                  We provide real-time data from official Blizzard leaderboards, updated every 5 minutes, to give you the most 
                  accurate and up-to-date rankings across all regions.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">Our Mission</h2>
                <p>
                  Our goal is to provide the Hearthstone Battlegrounds community with easy access to leaderboard data and 
                  player statistics. We believe in making competitive gaming data accessible and useful for everyone, from 
                  casual players to professional competitors.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">Features</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Real-time leaderboard updates from all regions</li>
                  <li>Global and regional rankings for both Solo and Duo modes</li>
                  <li>Detailed player statistics and rating history</li>
                  <li>Search functionality to find specific players</li>
                  <li>Mobile-friendly interface for on-the-go access</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">Data Source</h2>
                <p>
                  Our data is sourced directly from the official Hearthstone Battlegrounds leaderboards. We update our 
                  database every 5 minutes to ensure you have access to the most current rankings and statistics.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">Contact</h2>
                <p>
                  Have questions or suggestions? We&apos;d love to hear from you! You can reach us through our social media 
                  channels.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 