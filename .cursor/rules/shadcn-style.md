## shadcn/ui Styling Rules

When using shadcn/ui components, prefer the component’s built-in variants and defaults over adding new Tailwind classes.

### Default rule

Use shadcn primitives as the source of truth for spacing, borders, typography, colors, radius, hover states, focus states, disabled states, and variants.

Do **not** add Tailwind classes to shadcn components unless there is a specific layout or product reason.

Prefer this:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Leaderboard</CardTitle>
    <CardDescription>Top players by rating</CardDescription>
  </CardHeader>
  <CardContent>
    <LeaderboardTable />
  </CardContent>
</Card>