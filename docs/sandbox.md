# Sandbox data policy

Local test data is synthetic and lives only in the test mock server; the running starter never falls back to it. Do not clone a production database into a demo or test environment. If production-scale shapes are required, export through an approved pipeline that removes customers, addresses, orders, payment tokens, credentials, webhook secrets, analytics identifiers and merchant-private content; then validate anonymization before import.

## Hosted acceptance

A production-mode acceptance host may set `HEADLESS_ACCEPTANCE_LEASE_ID` together with the publishable key returned by the real fixture allocator. This explicit server configuration permits the maintained fixture store; it does not authorize payment, change API lease scope, or disable backend test-order quarantine. `/api/health` reports `deploymentMode: acceptance`. Normal merchant deployments must omit the setting and use their own store. Release the lease and remove its runtime secret after the browser journey.

Set `HEADLESS_STOREFRONT_URL=https://your-acceptance-host.example` to run the existing live browser suite against that deployed origin without starting a local Next.js server. This is separate from third-party merchant ownership or payment qualification.
