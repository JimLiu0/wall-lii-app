## shadcn/ui Styling Rules

When using shadcn/ui components, prefer the component’s built-in variants and defaults over adding new Tailwind classes.

### Default rule

Use shadcn primitives as the source of truth for spacing, borders, typography, colors, radius, hover states, focus states, disabled states, and variants.

Do **not** add Tailwind classes to shadcn components unless there is a specific layout or product reason.

### Prefer semantic primitives over raw elements

Use `Button` for clickable icons/actions (never clickable icon component directly).

Use `Input` for text/number entry controls (avoid raw `<input>` unless there is a documented reason).

### Color token rule

Prefer `text-foreground`, `text-muted-foreground`, `border-border`, `bg-background`, `bg-muted`.

Avoid hardcoded palettes (`text-white`, `text-zinc-*`, `text-gray-*`) unless matching a deliberate semantic status color.

### Table header typography guardrail

Do not override header typography with nested components that set `text-xs` (for example, default `Button` sizing inside table headers).

### Remove unused interaction plumbing

Do not leave non-used interaction plumbing (sorting/filter state, props, handlers) after UX decisions remove interactivity.

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