# 1Ecomm Next.js Storefront Starter

Free for authorized 1Ecomm customers and their developers to build and operate 1Ecomm-connected storefronts. You may deploy the finished store, but may not redistribute, resell, sublicense, mirror, or republish this starter or a reusable derivative. See [LICENSE.md](LICENSE.md).

This Next.js App Router starter uses 1Ecomm's managed commerce backend. The browser renders products, a persistent guest cart, checkout choices and guest order lookup. A supported non-hosted method creates a pending order; an enabled hosted method redirects to the merchant's payment provider. Card entry happens at the provider. Hosted payment remains subject to backend and provider qualification; this source update is not a general-availability declaration.

## Run it

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and set `HEADLESS_STORE_ID` to your provisioned 1Ecomm store ID, or use the `.env` downloaded from the merchant connection dialog. The included store ID is a test fixture, not a merchant deployment identity.

The manually dispatched **Post-deployment order acceptance** workflow allocates an expiring fixture after compatible deployment, injects that runtime into the server proxy, drives the real deployed catalog/cart/checkout/order/lookup APIs for physical, nonshipping and mixed carts, and releases each fixture. The physical case requires an eligible delivery method on the configured fixture store. During development, integration/wave branches run compilation only; final local tests precede main release. Local merchant setup remains store-ID-only.
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

## Authorized customer source package

1ecomm can supply a licensed source archive plus `manifest.json` and `SHA256SUMS` to an authorized customer. Receiving this archive does not require access to the private GitHub repository or npm registry. Verify the checksum, extract into a new directory, run `npm ci`, configure your store using `.env.example`, then `npm run build` and `npm start`. Keep the license notices. This is a Node.js/Docker storefront connected to 1ecomm's API, not a copy of the commerce backend. Static hosting alone cannot run the proxy or cart cookies.

The package uses `GET /v1/headless/products/:id/variants`. **Deploy the compatible API before adopting this starter revision.** The first Add action loads choices. Multiple variants require an explicit selection; unavailable options cannot be chosen. API failure stops the add instead of choosing a default. Prices/availability displayed here are advisory; the cart and checkout validate them again.

For maintainers, `npm run pack:customer` archives an allowlist from committed HEAD into `release/`; it never includes working-tree credentials, `.git`, installed dependencies, or CI fixture allocators. `npm run pack:check` installs and builds that exact archive in a temporary customer directory. Commit changes before packaging. These commands require a Git checkout; a customer can build/deploy the supplied archive without Git. CI artifacts remain private; delivery to an authorized merchant is still an operator step, not a public download service.

## Shopper cart review

The cart panel restores the current cookie-backed cart, lists server-priced lines and totals, and supports quantity changes and removal through the existing cart endpoints. Cart edits clear checkout preparation so delivery/payment choices are checked again. An unconfirmed item update blocks further changes until the shopper refreshes the cart; mutations are not automatically retried. An empty cart cannot proceed to checkout. Initial cart loading and in-flight changes block conflicting add/payment actions.

The SaaS final acceptance SSOT records passing local and deployed API browser evidence for cart persistence, quantity changes, removal, refresh and non-hosted checkout. Provider payment qualification and deployment on a merchant-owned HTTPS host remain separate acceptance gates.

When a cart mutation loses its response, Refresh cart reads the persisted result before allowing more edits. A successful recovery clears the previous cart error as well as the uncertainty warning. The live journey verifies this by dropping a response only after the real API has committed the quantity change; it does not fabricate an API response or retry the mutation.
