import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from 'next/script'
import NavBar from '@/components/NavBar';
import { Analytics } from "@vercel/analytics/react"

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
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
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'wallii - Hearthstone Battlegrounds Tracker'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'wallii - Hearthstone Battlegrounds Leaderboard & Stats Tracker',
    description: 'Track Hearthstone Battlegrounds leaderboards, player stats, and MMR history with wallii.',
    images: ['/og-image.jpg']
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
    google: 'your-google-site-verification',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="google-site-verification" content="Qtz9PYfR7FFiM9dXZOWfJ4RKtztrWIU2Xx3M2Bt5sHU" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="google-adsense-account" content="ca-pub-6613952474052415" />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6613952474052415"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${inter.className} antialiased bg-black text-white min-h-screen`}>
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
