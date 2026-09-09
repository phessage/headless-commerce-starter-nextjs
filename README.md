# 1Ecomm Next.js Storefront Starter

Free for authorized 1Ecomm customers and their developers to build and operate 1Ecomm-connected storefronts. You may deploy the finished store, but may not redistribute, resell, sublicense, mirror, or republish this starter or a reusable derivative. See [LICENSE.md](LICENSE.md).

This Next.js App Router starter uses 1Ecomm's managed commerce backend. The browser renders products, a persistent guest cart, checkout choices and guest order lookup. A supported non-hosted method creates a pending order; an enabled hosted method redirects to the merchant's payment provider. Card entry happens at the provider. Hosted payment remains subject to backend and provider qualification; this source update is not a general-availability declaration.

## Run it

1. Install Node.js 20 or newer.
2. Open `headless.config.json` and replace only `storeId` with your provisioned 1Ecomm store ID. The included ID is a safe test fixture.

The required CI browser gate allocates its own expiring fixture, injects that runtime into the server proxy, drives the real deployed catalog/cart/checkout/order/lookup APIs, and always revokes the temporary key. Local merchant setup remains store-ID-only.
3. Run:

```bash
npm ci
npm run check
npm run dev
```

4. Open `http://localhost:3000`. You should see products from the selected store. No source edit, API URL, or key copy is required.

`npm run check` makes a production build and launches the app for deterministic browser tests. `npm run test:e2e:live` creates an isolated fixture cart and pending bank-transfer test order against the deployed service. It does not move money.

The server route accepts only the starter's fixed commerce operations; it is not an unrestricted proxy. See [architecture](docs/architecture.md), [sandbox policy](docs/sandbox.md), and [production checklist](docs/production-readiness.md).

## Deploy on your hosting

Deploy the storefront server; 1Ecomm continues to run the commerce API, database and jobs. You need an authorized source download, a provisioned store, an active storefront application, exact allowed production/return origins and a qualified merchant payment connection. No payment-provider secret belongs in this package. Backend self-hosting is a separate product, not included here.

For a Node host, run `npm ci`, `npm run build`, then set `HEADLESS_STORE_ID` in the host's runtime environment and run `npm start`. For a container host:

```sh
docker build -t my-1ecomm-store:release-1 .
docker run -d --name my-store --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  -e HEADLESS_STORE_ID=YOUR_PROVISIONED_STORE_UUID \
  my-1ecomm-store:release-1
```

Place a TLS reverse proxy in front of port 3000, preserve the public request host, and set upload/time/rate limits there. `/api/health` checks current public configuration and cached bootstrap readiness; it does not create a cart or charge a card. The container runs as the `node` user. Keep the previous image for rollback and retain immutable static assets while old browser pages remain active.

`HEADLESS_STORE_ID` is read server-side at runtime, so the same image can be configured for your store. The default trusted API/bootstrap is `https://api.1ecomm.com`. Advanced operators may explicitly set `HEADLESS_BOOTSTRAP_URL` and `HEADLESS_API_URL` to approved HTTPS origins; bootstrap cannot redirect the server to a different trust root. Development permits loopback HTTP. Production refuses the included example store ID. Editing the imported JSON after compilation is not the runtime configuration mechanism.

The server sets a Secure HttpOnly cart cookie in production. After provider return, the page asks the shopper to check the order using its number and checkout email; a query parameter never marks an order paid. Complete a qualified test checkout before opening sales. SDK/backend commercial policy, zero commissions, subscription pricing and merchant settlement responsibility must be qualified separately.
