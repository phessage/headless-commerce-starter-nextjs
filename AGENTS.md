# 1ecomm development mode — owner directive, 2026-09-09

This directive supersedes older instructions about per-task testing, immediate main merges, primary-checkout switching and development-time compatibility work. Read the relevant ecommerce-docs SSOT before implementation and extend existing services.

- Preserve every existing checkout's active branch and other agents' work. Fetch origin and create each program integration branch from the latest origin/main. Current program: integration/saas-launch-20260909. Work in isolated Git worktrees on unique wave/* branches based on the current integration tip.
- PR/squash merge each functional batch into the integration branch, never main during implementation. Keep normal main release checks. Integration/wave push and integration-target PR builds are deferred with scoped workflow filters, not a repository-wide Actions shutdown. Do not dispatch tests, builds or live workflows during this phase.
- During implementation, create no new tests and run no unit, integration, browser, migration or security test suites. Verify changed code compiles/typechecks. Avoid scripts that bundle tests with compilation. Retain existing tests. Record new/changed behavior and every pending validation in the test SSOT; do not claim compilation proves runtime behavior.
- Update the master checklist after each batch. Track implementation/compile status separately from local-test and deployed-validation status. An implemented item can be closed in the implementation checklist while its explicitly separate validation remains pending.
- Once all agreed functionality is implemented, enter the final local stage: create/update the tests from the test SSOT, apply the program's generated migrations to an isolated local database, run the relevant combined local acceptance pass and fix failures. Do not add irrelevant suites.
- After final local acceptance passes, PR/merge integration branches into main, apply the program's production application migrations through the normal release path and monitor deployment. This is the owner's conditional authorization for that final release; do not ask again for routine actions within its reviewed scope. Enumerate the exact migration set first. Unrelated shared-database changes, credentials, destructive cleanup and unreviewed migration backlogs are outside this authorization.
- After production deployment, create/run real Playwright UI end-to-end acceptance against the deployed application. Exercise actual screens and network calls, assert persisted outcomes and rendered results, record evidence and clean up isolated fixtures. No mocked API responses, skipped prerequisites or fabricated UI proof.
- The system is in development. Do not add compatibility shims, legacy adapters or speculative security/compliance work as separate waves. Prioritize usable functionality; keep normal authorization, tenant scoping, payment correctness and credential handling intact as part of correct behavior.
- Keep SSOT and user-facing Help Hub content current. Remove only your merged batch worktrees/branches after recording restore SHAs. Keep the integration branch until the final main release; never delete another agent's work.

Program master checklist: ecommerce-docs/ssot/saas-launch-master-checklist.md.
Deferred validation: ecommerce-docs/ssot/tests/saas-launch-final-validation.md.
Shared engineering guide: ecommerce-docs/engineering-guide.md (integration branch during development).

---

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
