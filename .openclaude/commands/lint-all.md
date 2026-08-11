# /lint-all — Run all linters across the repo

Run lint for every service:

```bash
echo "=== Frontend lint ==="
cd frontend && npm run lint

echo "=== Backend lint ==="
cd backend && make lint

echo "=== Ingestion lint ==="
cd ingestion && npm run lint
```

If lint fails, fix the issues and re-run until clean.
