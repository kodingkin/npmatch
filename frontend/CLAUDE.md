# CLAUDE.md - Frontend

Next.js 15 app with HeroUI v3, Tailwind CSS v4, and Jest.

## Commands

```bash
npm run dev       # Next.js dev server (port 3000)
npm run build     # Production build
npm run lint      # ESLint on app/ directory
npm run lint:fix  # ESLint auto-fix
npm test          # Jest
npm run test:watch
npm run test:coverage
```

## Architecture

- **Page**: `app/page.tsx` — single-page app, no routing beyond `/`
- **API proxy**: `app/api/search/route.ts` — POST handler that forwards to the FastAPI backend, streams SSE response through. `API_URL` env var (defaults to `http://localhost:8000`)
- **Health check**: `app/api/search/health/route.ts` — GET endpoint that pings the backend's `/health`
- **Components**: `components/SearchForm.tsx`, `PackageCard.tsx`, `LlmPanel.tsx`, `StatusStates.tsx`
- **Hooks**: `useSearch` (SSE stream parser + state machine)
- **Types**: `types/index.ts` — `SearchState`, `NpmPackage`, `Framework`, `Priority`

## State machine

`SearchState.status` transitions: `idle` → `loading` → `streaming` → `done` | `empty` | `error`

The SSE parser in `useSearch` handles `event: packages`, `data:`, `event: error`, `event: done`.

## Styling

- Tailwind v4 with dark theme (`dark` class on `<html>`)
- HeroUI v3 components: `Link`, `Separator`, `Spinner`
- Fonts: JetBrains Mono (monospace) + DM Sans (body)
- Custom class `grid-bg` for the background pattern

## Testing

- Jest with jsdom environment
- Tests in `components/test/` — one per component
- Uses `@testing-library/react` and `@testing-library/user-event`
- CSS modules mocked via `identity-obj-proxy`

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.
