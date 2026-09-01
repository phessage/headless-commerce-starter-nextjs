# 1Ecomm Next.js Storefront Starter

This is a ready-to-run Next.js App Router shop. The server talks to 1Ecomm through a small fixed proxy, while the browser renders products, cart, checkout choices and a pending non-hosted order confirmation. It never charges a card or wallet.

## Run it

1. Install Node.js 20 or newer.
2. Open `headless.config.json` and replace only `storeId` with your provisioned 1Ecomm store ID. The included ID is a safe test fixture.
3. Run:

```bash
npm ci
npm run check
npm run dev
```

4. Open `http://localhost:3000`. You should see products from the selected store. No source edit, API URL, or key copy is required.

`npm run check` makes a production build and launches the app for deterministic browser tests. `npm run test:e2e:live` creates an isolated fixture cart and pending bank-transfer test order against the deployed service. It does not move money.

The server route accepts only the starter's fixed commerce operations; it is not an unrestricted proxy. See [architecture](docs/architecture.md), [sandbox policy](docs/sandbox.md), and [production checklist](docs/production-readiness.md).
