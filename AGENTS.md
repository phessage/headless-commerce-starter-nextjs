<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 1Ecomm AI engineering guide

Read `README.md`, `docs/architecture.md`, `docs/production-readiness.md`, `docs/sandbox.md`, the App Router source, and both Playwright suites before editing. Installed Next.js documentation is the framework authority; `phessage/ecommerce-service/contracts/headless-commerce-v1.openapi.yaml` is the commerce-contract authority.

## Architecture boundary

`headless.config.json` supplies one `storeId`. Server-side bootstrap discovers the API URL and publishable key. The browser may call only the constrained `/api/headless` adapter. Never create a caller-selectable proxy or expose server credentials. Validate bootstrap origin/scheme, bound redirects/body/timeouts, and keep an exact method/path allow-list.

The API owns tenant scope, pricing, inventory, shipping/payment eligibility and order creation. Preserve cart-token secrecy, stable order idempotency, non-retry of ordinary mutations/lookup, and neutral lookup failure. Use `items.length`, not an invented `itemCount`.

## Next.js/React practices

- Prefer Server Components for read-only server work; add `'use client'` only where interaction/browser APIs require it.
- Keep secrets, trusted runtime configuration and upstream calls in server-only modules.
- Do not cache shopper/cart/order-proof responses. Make public catalog cache behavior explicit and tenant-aware.
- Use route handlers as thin validation/transport adapters. Business calculations stay in the service.
- Use semantic, accessible HTML and explicit loading/error/uncertain-result states.
- `next build` does not lint in Next.js 16; do not assume it did. Read installed docs before using APIs recalled from training.

## License boundary

`LICENSE.md` allows authorized 1Ecomm customer projects and deployed or compiled shopper applications, but prohibits redistribution of this reusable starter or its derivatives. Preserve the notice in clones, packages, generated projects and documentation. Do not describe this repository as open source or grant broader rights in examples.

## Verification

Run `rm -rf node_modules .next && npm ci`, `npm run check`, and the deployed sandbox journey when authorized. Assert upstream method/path/headers and rendered results. Dependency upgrades require stable releases, lockfile, build and Playwright proof. Never clone production data.
