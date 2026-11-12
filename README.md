# Wallii

Wallii is a Hearthstone Battlegrounds companion site that displays real-time leaderboards, player stats, and patch summaries. It is built with Next.js and Supabase, and designed to be lightweight, useful, and open-source.

---

## 🚀 Getting Started (Local Development)

To run the app locally:

1. Clone the repo:

   ```bash
   git clone https://github.com/JimLiu0/wall-lii-app
   cd wall-lii-app
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run the development server:

   ```bash
   npm run dev
   ```

5. Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## Temporary hosting on Netlify

Import `JimLiu0/wall-lii-app` from GitHub and select the Free plan. The repository's
`netlify.toml` uses Node.js 22, `npm run build`, and `.next`. Netlify automatically
applies its Next.js adapter; do not deploy `.next` as a plain static folder.

Before the first build, configure these variables in Netlify's project environment
settings (never commit their values):

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: required for data,
  available at build time and runtime. Use the public anon key, not a service-role key.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: required to retain stats
  rate limiting and automatic IP blocking. Without them, the existing middleware
  skips those protections. Ensure they are available to middleware at runtime.

Vercel Analytics is enabled only on Vercel; Google Analytics remains enabled on both
hosts. The removed Edge Config integration is not needed.

Verify the Netlify preview's homepage, leaderboard, player Day/Week/Season views,
news, and `/api/og` before switching domains. Add `wallii.gg` and `www.wallii.gg`
to Netlify, then use the exact DNS records shown by its domain setup. Keep the
existing DNS provider and unrelated mail/TXT records. Record the old web records
before replacing them so the cutover can be reversed.

Netlify Free has a shared monthly usage cap and pauses projects at the limit.
Keep the team on Free and check usage after publishing. See the current
[Netlify pricing](https://www.netlify.com/pricing/) and
[Next.js deployment documentation](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).

## 🛠️ Contributing

Contributions are welcome! Here’s how to get started:

- You only need the public Supabase `anon` key and URL to develop
If you're working on a feature, feel free to open a draft PR and ask questions!

---

## 🧱 Supabase Schema

### `daily_leaderboard_stats`

Stores an MMR snapshot of each player+region+game_mode combo. Updated every 5 minutes. Only 1 entry per day.

| Column              | Type      | Description                                |
|---------------------|-----------|--------------------------------------------|
| `player_name`       | text      | Player’s in-game name                      |
| `game_mode`         | text      | '0' = solo, '1' = duos                     |
| `region`            | text      | One of: NA, EU, AP, CN                     |
| `day_start`         | date      | Day of the snapshot                        |
| `rating`            | integer   | Player’s rating at the start of the day    |
| `rank`              | integer   | Player’s rank among others that day        |
| `games_played`      | integer   | Number of games played that day            |
| `updated_at`        | timestamp | Last time the record was updated           |
| `weekly_games_played` | integer | Games played in the current week           |

**Example Rows:**

```json
[
  {
    "player_name": "jeef",
    "game_mode": "0",
    "region": "NA",
    "day_start": "2025-07-03",
    "rating": 18212,
    "rank": 1,
    "games_played": 12,
    "updated_at": "2025-07-04 06:56:13.661382+00",
    "weekly_games_played": 24
  },
  {
    "player_name": "beterbabbit",
    "game_mode": "0",
    "region": "NA",
    "day_start": "2025-07-03",
    "rating": 16214,
    "rank": 2,
    "games_played": 17,
    "updated_at": "2025-07-04 06:56:13.661394+00",
    "weekly_games_played": 35
  }
]
```

### `bg_entities`

Tracks Battlegrounds-specific entities (minions, heroes, anomalies, etc.), scraped from [hearthstone.wiki.gg](https://hearthstone.wiki.gg).

| Column        | Type   | Description                                      |
|---------------|--------|--------------------------------------------------|
| `entity_name` | text   | Name of the BG entity                            |
| `image_url`   | text   | URL to its image on hearthstone.wiki.gg          |

**Example Rows:**

```json
[
  {
    "entity_name": "All Bottled Up",
    "image_url": "https://hearthstone.wiki.gg/images/thumb/0/0a/BGDUO_Anomaly_005.png/235px-BGDUO_Anomaly_005.png?7ef16f"
  },
  {
    "entity_name": "Audience's Choice",
    "image_url": "https://hearthstone.wiki.gg/images/thumb/3/31/BG27_Anomaly_580.png/235px-BG27_Anomaly_580.png?bfccb5"
  }
]
```

### `channels`

Records known Twitch streamers and their associated in-game names.

| Column     | Type    | Description                     |
|------------|---------|---------------------------------|
| `channel`  | text    | Twitch username                 |
| `player`   | text    | Corresponding in-game name      |
| `youtube`  | text    | YouTube handle (if provided)    |
| `live`     | boolean | Whether they're currently live  |
| `added_at` | timestamp | When the record was added     |

**Example Rows:**

```json
[
  {
    "channel": "skro_tv",
    "player": "skro",
    "youtube": "",
    "live": false,
    "added_at": null
  },
  {
    "channel": "scarlett",
    "player": "scarlett",
    "youtube": "",
    "live": false,
    "added_at": null
  }
]
```

### `chinese_streamers`

Records Chinese streamers and their associated game names and links.

| Column      | Type   | Description                             |
|-------------|--------|-----------------------------------------|
| `player`    | text   | In-game name shown on stream             |
| `url`       | text   | Livestream URL                           |
| `platform`  | text   | Optional platform (Douyin, Huya, etc.)   |
| `notes`     | text   | Optional notes                           |
| `real_name` | text   | The real name of the streamer (optional) |

**Example Rows:**

```json
[
  {
    "player": "抖音｜有局｜小璐",
    "url": "https://live.douyin.com/765006140559",
    "platform": null,
    "notes": null,
    "real_name": "小狼"
  },
  {
    "player": "虎牙｜郭枫荷",
    "url": "https://www.huya.com/139473",
    "platform": null,
    "notes": null,
    "real_name": "郭枫荷"
  }
]
```

---

### `leaderboard_snapshots`

Records a player’s rank and rating snapshot every 5 minutes. Duplicate and consecutive rating entries are pruned regularly, except for the first and last entries of the day.

| Column        | Type      | Description                              |
|---------------|-----------|------------------------------------------|
| `player_name` | text      | In-game player name                      |
| `rating`      | integer   | Player's rating at the snapshot moment   |
| `rank`        | integer   | Leaderboard rank at the snapshot moment  |
| `region`      | text      | Region (e.g., NA, EU, AP, CN)            |
| `game_mode`   | text      | Game mode: '0' for solo, '1' for duos    |
| `taken_at`    | timestamp | Time the snapshot was taken              |

**Example Rows:**

```json
[
  {
    "player_name": "jeef",
    "rating": 18100,
    "rank": 1,
    "region": "NA",
    "game_mode": "0",
    "taken_at": "2025-07-03T12:00:00+00:00"
  },
  {
    "player_name": "beterbabbit",
    "rating": 16100,
    "rank": 2,
    "region": "NA",
    "game_mode": "0",
    "taken_at": "2025-07-03T12:05:00+00:00"
  }
]
```


### `milestone_tracking`
Tracks when rating milestones are hit. Snapshots and milestone checks are taken together.

```json
[
  {
    "season": 15,
    "game_mode": "0",
    "region": "NA",
    "milestone": 8000,
    "player_name": "ネゲター",
    "timestamp": "2025-04-30 17:39:45.143694+00",
    "rating": 8145
  },
  {
    "season": 15,
    "game_mode": "0",
    "region": "AP",
    "milestone": 8000,
    "player_name": "duckdragon",
    "timestamp": "2025-04-30 17:39:45.143694+00",
    "rating": 8139
  }
]
```


### `news_posts`
OpenAI-processed news posts used for /news display. See [this lambda function](https://github.com/HS-Tools/Wall_Lii/tree/main/lambda-functions/fetch_news) for generation details.

```json
[
  {
    "id": 1,
    "title": "Announcing Battlegrounds Season 10 – Second Nature!",
    "slug": "announcing-battlegrounds-season-10-second-nature",
    "type": "patch",
    "content": "......",
    "summary": "Battlegrounds Season 10 introduces a massive minion refresh with over 75 new and returning minions, the return of Trinkets with over 100 new offerings, and two new heroes, Forest Lord Cenarius and Buttons.",
    "image_url": "https://bnetcmsus-a.akamaihd.net/cms/blog_thumbnail/u5/U591LX2YCBFT1744661735540.jpg",
    "author": "Blizzard Entertainment",
    "source": "https://playhearthstone.com/en-us/blog/24196381",
    "created_at": "2025-04-17 17:49:53.292+00",
    "updated_at": "2025-04-22 21:07:03.335237+00",
    "is_published": true,
    "battlegrounds_relevant": true
  },
  {
    "id": 2,
    "title": "Upcoming Features Schedule Update",
    "slug": "upcoming-features-schedule-update",
    "type": "patch",
    "content": "......",
    "summary": "I'm sorry, but the provided text does not contain any specific gameplay changes for Hearthstone Battlegrounds. Please provide the detailed patch notes or blog post that includes the actual gameplay up...",
    "image_url": "https://bnetcmsus-a.akamaihd.net/cms/blog_thumbnail/78/78OUSG2EOJK71721947059321.jpg",
    "author": "Nathan Lyons-Smith, Executive Producer",
    "source": "https://playhearthstone.com/en-us/blog/24191048",
    "created_at": "2025-04-16 23:38:55.001+00",
    "updated_at": "2025-04-22 21:07:05.40154+00",
    "is_published": true,
    "battlegrounds_relevant": false
  }
]
```
