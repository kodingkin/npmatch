# Review Guidelines

Standard review rules and result template for npmatch PRs. Every review finding is classified into one of six categories: **Critical**, **Blocker**, **Recommend**, **Refactor**, **Security**, **Performance**.

## Category definitions

| Category | Meaning | Merge impact |
|---|---|---|
| **Critical** | Ship-stopping: data loss, breach, outage, or corrupt state. No acceptable workaround. | Must be fixed. Never merge. |
| **Blocker** | Functional bug, broken contract, missing essential tests, CI failure, or user-facing crash. | Must be resolved before merge, or an explicit follow-up issue is agreed. |
| **Recommend** | Improvement that should be addressed but does not block the PR (edge cases, best practices, observability). | Non-blocking. Track as follow-up. |
| **Refactor** | Maintainability: duplication, complexity, naming, dead code. | Non-blocking. |
| **Security** | Security finding: injection, secrets, SSRF, XSS, auth/CORS, vulnerable deps. Usually also Critical/Blocker severity. | Treat as Critical unless proven otherwise. |
| **Performance** | Perf finding: N+1 queries, large payloads, blocking calls in async paths, missing caching/pagination. | Depends on impact; flag severity explicitly. |

Security and Performance are concern types that pair with a severity. When a finding falls into either, also state its severity (e.g. `[Security · Critical]`).

## Review rules

Reference the rule code when filing a finding so the author can map it back.

### Critical (CR)
- **CR-1** No secrets in the repo: `.env`, API keys, tokens, connection strings. Check diffs and git history.
- **CR-2** Changes to the production search path (`POST /api/search` SSE flow, RAG pipeline, embed/retrieve/synthesize) must not break existing behavior without a migration plan.
- **CR-3** No data-loss risk in upserts or idempotency logic (Qdrant deterministic UUIDs, Postgres `ON CONFLICT (name) DO UPDATE`).
- **CR-4** Downstream failures (OpenAI, Qdrant, Postgres) must degrade gracefully, not take the API down.

### Blocker (BL)
- **BL-1** Behavior contradicts the PR description or issue intent.
- **BL-2** Breaking an API contract (request/response schema, SSE event names, field names) without updating every consumer (frontend proxy, hooks, tests).
- **BL-3** No tests for the changed logic path where test infrastructure exists (pytest, jest).
- **BL-4** CI failing: lint, typecheck, build, or tests.
- **BL-5** Unhandled errors on the user-facing path — crashes, unhandled promise rejections, blank states.
- **BL-6** Missing or incorrect env wiring between frontend proxy, backend, and infra.

### Recommend (RC)
- **RC-1** Edge cases: empty results, null payloads, rate-limit handling, aborted SSE connections.
- **RC-2** User-facing copy and error messages follow the repo's concise, punchy style.
- **RC-3** Add logging/observability where a failure would otherwise be silent.
- **RC-4** Docs (README, PR description) that should reflect the behavior change.

### Refactor (RF)
- **RF-1** Duplicated logic worth sharing (only past ~3 occurrences — three similar lines is fine).
- **RF-2** Overly long/complex functions that obscure intent; split them.
- **RF-3** Naming that obscures meaning.
- **RF-4** Dead code, unused imports, commented-out blocks.
- **RF-5** Non-idiomatic patterns for the stack (FastAPI, Next.js 15 App Router, TypeScript, Terraform).

### Security (SEC)
- **SEC-1** Injection: SQL, shell, or prompt injection into the LLM context.
- **SEC-2** SSRF: fetching user-supplied URLs.
- **SEC-3** XSS: `dangerouslySetInnerHTML` or unescaped LLM output rendered in React.
- **SEC-4** Auth/authz gaps, misconfigured CORS, or the backend URL/keys leaking into the client bundle.
- **SEC-5** Secrets exposed in logs or error responses.
- **SEC-6** Vulnerable or deprecated dependencies (`npm audit`, `pip-audit`, Dependabot).

### Performance (PERF)
- **PERF-1** N+1 queries or missing indexes on Postgres paths.
- **PERF-2** Large payloads to the client: bundle size, unneeded response fields, unthrottled streaming.
- **PERF-3** Blocking calls in async handlers (sync HTTP calls, CPU-bound work in FastAPI `async def`).
- **PERF-4** Missing caching/pagination where data grows (search results, health polling).
- **PERF-5** Unbounded memory/streams in SSE or ingestion batches.

## Review result template

Copy this into the PR review summary. Fill only sections with findings; keep the empty ones as `- None`.

```markdown
## Review Result

**Verdict:** APPROVE / REQUEST CHANGES / COMMENT

### Critical
| File:Line | Rule | Finding |
|---|---|---|
| | | |

### Blocker
| File:Line | Rule | Finding |
|---|---|---|
| | | |

### Recommend
| File:Line | Rule | Finding |
|---|---|---|
| | | |

### Refactor
| File:Line | Rule | Finding |
|---|---|---|
| | | |

### Security
| File:Line | Rule | Severity | Finding |
|---|---|---|---|
| | | | |

### Performance
| File:Line | Rule | Severity | Finding |
|---|---|---|---|
| | | | |

### Overall
Summary, strengths, and any agreed follow-ups (linked issue numbers).
```

## Verdict rules

- **Any Critical or Security finding** → `REQUEST CHANGES`, do not merge.
- **Blocker findings** → `REQUEST CHANGES`, or merge only with an explicitly agreed, tracked follow-up.
- **Recommend / Refactor / Performance** → non-blocking; note them as follow-ups, do not block the merge.
