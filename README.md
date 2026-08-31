# 1Ecomm Headless Commerce Next.js Starter

Production-oriented App Router storefront with a deterministic, sanitized demo API and real Playwright browser tests.

## Run

```bash
npm install
npm run dev
# another terminal
npm run test:e2e
```

The demo route contains invented products only. It never reads or copies production data. Set `HEADLESS_API_URL`, `HEADLESS_PUBLISHABLE_KEY`, and `HEADLESS_STORE_ID` when a qualified platform sandbox becomes available.

See [architecture](docs/architecture.md), [sandbox policy](docs/sandbox.md), and [production checklist](docs/production-readiness.md).
