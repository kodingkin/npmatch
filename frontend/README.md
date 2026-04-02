# npmatch — frontend

Frontend for [npmatch](https://www.youtube.com/watch?v=dQw4w9WgXcQ)

Next.js 15 · TypeScript · HeroUI · Tailwind CSS

## Setup

```bash
git clone https://github.com/kodingkin/npmatch
cd frontend

npm install
cp .env.local.example .env.local

npm run dev
```

## Test

```bash
npm test
```

## Environment variables

Create a `.env` file in `frontend/`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Project structure

```
src/
  api/
    search/
      route.ts        # Route for the LLM search
      health/
        route.ts      # Route for health check on the backend API
  app/
    layout.tsx
    page.tsx          # Main page — assembles all components
    globals.css       # Tailwind base + custom animations/prose
  components/
    SearchForm.tsx    # Textarea, framework selector, priority chips, submit
    PackageCard.tsx   # Package card + skeleton version
    LlmPanel.tsx      # Streaming markdown panel with HeroUI Spinner
    StatusStates.tsx  # EmptyState + ErrorState
  hooks/
    useSearch.ts      # All SSE streaming logic, search state machine
    useHealthCheck.ts # Health check Pooling on python backend
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
