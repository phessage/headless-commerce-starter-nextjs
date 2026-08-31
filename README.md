# 1Ecomm Headless Commerce Next.js Starter

Production-oriented App Router storefront with a deterministic, sanitized demo API and real Playwright browser tests.

## Run

```bash
npm install
npm run dev
# another terminal
npm run test:e2e
```

The demo route contains invented products only. It never reads or copies production data. Set `HEADLESS_API_URL` and `HEADLESS_PUBLISHABLE_KEY` to use the server-side live proxy. The browser receives neither the key nor an unrestricted upstream proxy; only the documented cart routes are forwarded.

With a dedicated test tenant configured, run `npm run test:e2e:live` for a real browser journey covering catalog, cart creation, add-to-cart, checkout preparation, and server-provided shipping/payment selection. The command fails closed when either environment variable is absent. Never clone production customer data into a demo environment.

See [architecture](docs/architecture.md), [sandbox policy](docs/sandbox.md), and [production checklist](docs/production-readiness.md).
