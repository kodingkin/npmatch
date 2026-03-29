# npmatch — frontend

Next.js 15 · TypeScript · HeroUI · Tailwind CSS · Vercel

## Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## Environment variables

```
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Project structure

```
src/
  app/
    layout.tsx        # HeroUI Provider, Google Fonts
    page.tsx          # Main page — assembles all components
    providers.tsx     # HeroUIProvider wrapper ("use client")
    globals.css       # Tailwind base + custom animations/prose
  components/
    SearchForm.tsx    # Textarea, framework selector, priority chips, submit
    PackageCard.tsx   # Package card + skeleton version
    LlmPanel.tsx      # Streaming markdown panel with HeroUI Spinner
    StatusStates.tsx  # EmptyState + ErrorState
  hooks/
    useSearch.ts      # All SSE streaming logic, search state machine
  types/
    index.ts          # Shared types, constants
```

## HeroUI components used

- `Button` — submit + retry/reset actions
- `Textarea` — main query input
- `Select` — framework selector
- `Chip` — priority tag toggles
- `Card` — package cards, LLM panel, status states
- `Spinner` — HeroUI dark-themed spinner, used in loading states and section headers
- `Link` — npm URL links
- `Divider` — section separator

## SSE streaming notes

`EventSource` is not used because it doesn't support POST requests.
The hook uses `fetch` + `ReadableStream` reader directly.

Chunk batching: SSE chunks from the backend may arrive batched in a single `read()`.
The hook always splits on `\n` and processes line by line to handle this correctly.

## Design

- Dark theme via HeroUI's built-in dark mode (`<html className="dark">`)
- npm red (`#CB3837`) as accent — used on focus rings, primary button, links, spinners
- JetBrains Mono for all code/mono elements, DM Sans for prose
- Subtle dot-grid background for depth
- Skeleton shimmer animation while waiting for `event: packages`
- Blinking cursor while LLM is streaming
- `fade-in-up` keyframe animation on cards and panels as they appear
