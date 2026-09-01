# 1Ecomm Headless Commerce Next.js Starter

Production-oriented App Router storefront with a deterministic, sanitized demo API and real Playwright browser tests.

## Run

```bash
npm install
npm run dev
# another terminal
npm run test:e2e
```

Change `storeId` in `headless.config.json` to run the catalog, anonymous-cart and checkout-preparation app for another configured store. The server resolves the public runtime document; the browser receives neither the publishable key nor an unrestricted upstream proxy.

Run `npm run test:e2e:live` for a real browser journey covering catalog, cart creation, add-to-cart, checkout preparation, and server-provided shipping/payment selection. Never clone production customer data into a demo environment.

See [architecture](docs/architecture.md), [sandbox policy](docs/sandbox.md), and [production checklist](docs/production-readiness.md).
