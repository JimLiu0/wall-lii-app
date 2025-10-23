import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wallii Bot Setup & Commands - Hearthstone Battlegrounds',
  description: 'Learn how to set up the Wallii bot for Twitch/YouTube and use Hearthstone Battlegrounds commands like !rank, !stats, and more.'
};

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
