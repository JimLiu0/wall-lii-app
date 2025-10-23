'use client';

import { Typography, Box, Paper, Divider, Alert, AlertTitle } from "@mui/material";
import Image from 'next/image';
import CopyButton from '@/components/CopyButton';
import { useState } from "react";
import { Info, X } from 'lucide-react';

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
  const [showBotInfo, setShowBotInfo] = useState(true);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1000, mx: "auto" }}>
      {showBotInfo && (
        <Alert
          severity="info"
          icon={<Info className="w-5 h-5" />}
          sx={{
            mb: 3,
            backgroundColor: "#1e293b",
            color: "#cbd5e1",
            borderRadius: "8px",
            border: "1px solid #2563eb",
            alignItems: "flex-start"
          }}
          action={
            <button
              aria-label="close"
              onClick={() => setShowBotInfo(false)}
              style={{
                background: "none",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                padding: 0,
                marginLeft: 8,
                display: "flex",
                alignItems: "center"
              }}
            >
              <X className="w-5 h-5" />
            </button>
          }
        >
          <AlertTitle sx={{ color: "#60a5fa" }}>Important for Wallii Bot Setup</AlertTitle>
          <ul style={{ margin: 0, paddingLeft: "1.2em" }}>
            <li>
              <strong>Wallii must be a mod or VIP</strong> in your channel if you have follower-only mode enabled, or the bot will not be able to chat.
            </li>
            <li>
              <strong>Wallii only joins your channel when you go live.</strong> This is due to a 100 channel limit. If you do not see the bot, try going live and using a command in chat.
            </li>
          </ul>
        </Alert>
      )}
      <Paper
        elevation={3}
        sx={{
          p: { xs: 2, md: 4 },
          backgroundColor: "#111827",
          borderRadius: "12px",
          color: "#F3F4F6"
        }}
      >
        <Typography variant="h4" fontWeight={700} gutterBottom>
          🛠️ Manage Twitch Bot
        </Typography>

        <Typography variant="body1" gutterBottom>
          These commands must be used in Twitch chat on{" "}
          <a
            href="https://twitch.tv/WalliiBot"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#60A5FA" }}
          >
            twitch.tv/WalliiBot
          </a>
        </Typography>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          {managementCommands.map((cmd) => (
            <div
              key={cmd.command}
              className="bg-gray-800 rounded-lg p-4 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <code className="text-blue-400">{cmd.command}</code>
                <CopyButton text={cmd.command} />
              </div>
              <p className="text-sm text-gray-300">{cmd.description}</p>
              <div className="relative h-48 mt-2">
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

        <Divider sx={{ my: 4, borderColor: "#374151" }} />

        <Typography variant="h5" fontWeight={600} gutterBottom>
          📚 Command Reference
        </Typography>

        {Object.entries(helpMessages).map(([key, desc]) => (
          <Box
            key={key}
            sx={{
              mb: 3,
              backgroundColor: "#1F2937",
              p: 2,
              borderRadius: "8px"
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <Typography variant="subtitle1" fontWeight="bold" sx={{ fontFamily: "monospace", color: "#93C5FD" }}>
                !{key}
              </Typography>
              <CopyButton text={`!${key}`} />
            </div>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {desc}
            </Typography>
          </Box>
        ))}
      </Paper>
    </Box>
  );
}
