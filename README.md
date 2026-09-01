# 1Ecomm Headless Commerce Next.js Starter

Production-oriented App Router storefront with a deterministic, sanitized demo API and real Playwright browser tests.

## Run

```bash
npm install
npm run dev
# another terminal
npm run test:e2e
```

Change `storeId` in `headless.config.json` to run the catalog, anonymous-cart, checkout-preparation, and non-hosted pending-order app for another configured store. The server resolves the public runtime document; the browser receives neither the publishable key nor an unrestricted upstream proxy. Order placement is offered only for a server-approved non-hosted method and retains one idempotency key across an uncertain retry.

Run `npm run test:e2e:live` for a real browser journey covering catalog, cart creation, add-to-cart, checkout preparation, server-provided shipping/payment selection, and pending-order confirmation. Never clone production customer data into a demo environment.

See [architecture](docs/architecture.md), [sandbox policy](docs/sandbox.md), and [production checklist](docs/production-readiness.md).
