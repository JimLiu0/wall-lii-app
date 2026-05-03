# Wallii Agent Instructions

## Product

Wallii is a Hearthstone Battlegrounds stats, leaderboard, live-stream discovery, and news app.

Main product areas:
- `/`
- `/lb`
- `/stats/[player]`
- `/news`
- `/news/[slug]`

## Goal

Optimize for human understanding first.

Prefer boring, explicit, predictable code over clever abstractions.

## Architecture

- Use Next.js App Router conventions.
- `page.tsx` files are Server Components by default.
- Fetch initial route data on the server by default.
- Use Client Components only for browser state, effects, event handlers, local storage, history, URL mutation, virtualization, copy actions, charts, or interactive controls.
- Route-specific code lives inside its route folder.
- New route components live in route-local `_components`.
- New route data and derived-data logic live in route-local `_lib`.
- Promote code to shared only after reuse across product areas is clear.
- Do not move logic across route ownership boundaries unless the behavior is genuinely shared.
- Keep stats logic under `/stats`.
- Keep leaderboard logic under `/lb`.
- Keep news logic under `/news`.
- Keep domain knowledge in `/skills`.
- Preserve public URLs and query parameters.

## Data

- Keep Supabase access centralized in existing utilities or route-local data modules.
- Keep pure derived-data logic outside interactive components.
- Preserve leaderboard snapshot semantics: rank, rating, region, game mode, games played, deltas, placements, and social indicators are snapshot-derived.
- Preserve leaderboard global behavior excluding CN.
- Preserve leaderboard daily and weekly baseline semantics.
- Preserve leaderboard placement thresholds.
- Preserve the 5-minute in-memory leaderboard cache.

## Components

- Do not add `Client` suffix broadly.
- Use a `Client` suffix only for explicit server-to-client handoff boundaries.
- Keep browser-only URL and history state inside the owning Client Component.
- Keep subsequent client-driven pagination, search, date changes, and load-all behavior in the owning Client Component unless an API route is introduced.
- Prefer duplication over premature abstraction.
- Remove unused components, state, props, and handlers.

## Metadata

- Root layout owns site-wide metadata defaults, `metadataBase`, verification, robots, and title template.
- Page metadata should set only route-specific title, description, canonical URL, or genuinely route-specific previews.
- Do not duplicate the site brand in page titles when the root title template applies it.
- Do not reference stale static Open Graph images.

## UI

- Match the existing shadcn/Radix/Tailwind style.
- Treat shadcn primitives as the source of truth for spacing, borders, typography, color, radius, and interactive states.
- Add Tailwind only for layout or deliberate product-specific adjustments.
- Use `Button` for clickable actions and `Input` for text or number fields.
- Prefer theme tokens over ad hoc colors.
- Use Lucide icons when they improve scanability.
- Keep leaderboard and profile surfaces dense, legible, and useful for repeat visits.

## Verification

- Run the narrowest useful check while iterating.
- Run `npm run lint` before handoff.
- Run `npm run build` after TypeScript, data-shape, route-boundary, or server/client changes.
- Run `npm run check` for broad or risky changes.
- Report missing scripts, missing environment variables, and external service failures clearly.
