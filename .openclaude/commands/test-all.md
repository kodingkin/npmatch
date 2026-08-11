# /test-all — Run all test suites across the repo

Run tests for every service that has them:

```bash
echo "=== Frontend tests ==="
cd frontend && npm test

echo "=== Backend tests ==="
cd backend && make test

echo "=== Ingestion tests ==="
cd ingestion && npm test
```

Report failures clearly. Do NOT fix test failures unless asked — just report them.
