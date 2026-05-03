import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from 'next/script'
import NavBar from './_components/NavBar';
import { Analytics } from "@vercel/analytics/react"

const inter = Inter({ subsets: ['latin'] });

const themeInitScript = `(() => {
  try {
    const storedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolvedTheme = storedTheme === 'light' || storedTheme === 'dark'
      ? storedTheme
      : (prefersDark ? 'dark' : 'light');
    const root = document.documentElement;

    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.style.colorScheme = resolvedTheme;
  } catch (_) {}
})();`;

export const metadata: Metadata = {
  metadataBase: new URL('https://wallii.gg'),
  title: {
    default: 'wallii - Hearthstone Battlegrounds Leaderboard & Stats Tracker',
    template: '%s | wallii'
  },
  description: 'wallii is a Twitch bot and companion app for tracking Hearthstone Battlegrounds leaderboards, player stats, and MMR history. Track your favorite players, view detailed statistics, and monitor rating changes over time.',
  keywords: ['Hearthstone Battlegrounds', 'leaderboard', 'HSBG stats', 'wallii', 'Twitch bot', 'MMR tracking', 'player stats', 'rating history', 'Battlegrounds tracker'],
  authors: [{ name: 'wallii Team' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://wallii.gg',
    siteName: 'wallii',
    title: 'wallii - Hearthstone Battlegrounds Leaderboard & Stats Tracker',
    description: 'Track Hearthstone Battlegrounds leaderboards, player stats, and MMR history with wallii.',
  },
  twitter: {
    card: 'summary',
    title: 'wallii - Hearthstone Battlegrounds Leaderboard & Stats Tracker',
    description: 'Track Hearthstone Battlegrounds leaderboards, player stats, and MMR history with wallii.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'Qtz9PYfR7FFiM9dXZOWfJ4RKtztrWIU2Xx3M2Bt5sHU',
    other: {
      'google-adsense-account': 'ca-pub-6613952474052415',
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script id="theme-init" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6613952474052415"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${inter.className} antialiased min-h-screen bg-background text-foreground`}>
        <NavBar />
        <main>
          {children}
        </main>
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-XCBFMRMS2K"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XCBFMRMS2K');
          `}
        </Script>
        <Analytics />
      </body>
    </html>
  );
}
