'use client';

import Image from 'next/image';
import CopyButton from '@/components/shared/CopyButton';
import { Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppLink } from '@/components/ui/app-link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const helpMessages = {
  rank: "Use !rank [player] [server]: Get the rank of a player. Use the optional 'duo' prefix for duos. Defaults to the channel name if no player is specified. Example: !rank lii NA or !duorank lii NA",
  day: "Use !day [player] [server]: Get daily stats for a player. Use the optional 'duo' prefix for duos. Defaults to the channel name if no player is specified. Example: !day lii NA or !duoday lii NA",
  week: "Use !week [player] [server]: Get weekly stats for a player. Use the optional 'duo' prefix for duos. Defaults to the channel name if no player is specified. Example: !week lii NA or !duoweek lii NA",
  top: "Use !top [server]: Display top players. Use the optional 'duo' prefix for duos. If no server is specified, top players globally are shown. Example: !top NA or !duotop NA",
  lastweek: "Use !lastweek [player] [server]: Get stats from the previous week for a player. Use the optional 'duo' prefix for duos. Defaults to the channel name if no player is specified. Example: !lastweek lii NA or !duolastweek lii NA",
  yday: "Use !yday [player] [server]: Get yesterday's stats for a player. Use the optional 'duo' prefix for duos. Defaults to the channel name if no player is specified. Example: !yday lii NA or !duoyday lii NA",
  peak: "Use !peak [player] [server]: Get the peak rating of a player. Use the optional 'duo' prefix for duos. Defaults to the channel name if no player is specified. Example: !peak lii NA or !duopeak lii NA",
  stats: "Use !stats [server]: Display server stats. Use the optional 'duo' prefix for duos. If no server is specified, stats for all servers are shown. Example: !stats NA or !duostats NA",
  buddy: "Use !buddy [player]: Get the buddy of a hero or player. Example: !buddy lii",
  goldenbuddy: "Use !goldenbuddy [player]: Get the golden buddy of a hero or player. Example: !goldenbuddy lii",
  trinket: "Use !trinket [trinket name]: Get the trinket description. Example: !trinket ship in a bottle",
  buddygold: "Use !buddygold [tier]: Get how much base gold a buddy of that tier costs. Example: !buddygold 3",
  patch: "Use !patch: Get the current patch link. Example: !patch"
};

const managementCommands = [
  {
    command: '!addchannel',
    image: '/addchannel.png',
    description: 'Add your channel to the bot. Do this before other commands'
  },
  {
    command: '!deletechannel',
    image: '/deletechannel.png',
    description: 'Remove your channel from the bot'
  },
  {
    command: '!addname',
    image: '/addname.png',
    description: 'Add your player name to your channel'
  },
  {
    command: '!addyoutube',
    image: '/addyoutube.png',
    description: 'Link your youtube to your channel',
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 bg-background p-4 md:p-8">
      <Alert
        variant="info"
        className="text-center"
      >
        <AlertTitle>
          <Info />
          Important for Wallii Bot Setup
        </AlertTitle>
        <AlertDescription>
          Wallii must be a mod or VIP in your channel if follower-only mode is enabled, otherwise it cannot chat. The bot only joins when you go live due to a 100-channel limit—if it&apos;s not present, go live and run a command in chat.
        </AlertDescription>
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>🛠️ Manage Twitch Bot</h1>
          </CardTitle>
          <CardDescription>
            These commands must be used in Twitch chat on{' '}
            <AppLink
              href="https://twitch.tv/WalliiBot"
              target="_blank"
              rel="noopener noreferrer"
            >
              twitch.tv/WalliiBot
            </AppLink>
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {managementCommands.map((cmd) => (
              <div
                key={cmd.command}
                className="flex flex-col gap-2 rounded-lg border border-border bg-muted/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <code className="text-link">{cmd.command}</code>
                  <CopyButton text={cmd.command} />
                </div>
                <p className="text-sm text-muted-foreground">{cmd.description}</p>
                <div className="relative mt-2 h-48">
                  <Image
                    src={cmd.image}
                    alt={`Example of ${cmd.command}`}
                    fill
                    className="rounded-md object-contain"
                  />
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <h2 className="text-xl font-semibold text-foreground">📚 Command Reference</h2>

          <div className="flex flex-col gap-3">
            {Object.entries(helpMessages).map(([key, desc]) => (
              <div
                key={key}
                className="rounded-lg border border-border bg-muted/50 p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <code className="font-bold text-link">!{key}</code>
                  <CopyButton text={`!${key}`} />
                </div>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
