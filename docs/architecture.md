# Architecture

The App Router renders the storefront shell and keeps platform access behind constrained server-side route handlers. The server resolves a public runtime from the single configured `storeId`, then calls the deployed `/v1/headless` contracts without exposing the publishable key to browser code. Bootstrap and API failures fail closed with an unavailable response; the application never substitutes synthetic products or commerce results. A rejected bootstrap promise is evicted so a transient outage can recover without restarting the Next.js process.

Cart and checkout requests use a narrowly allowlisted Route Handler proxy. It forwards only the resolved publishable key, cart token, JSON content type, and—for the fixed order route—the caller's idempotency key. The UI enables placement only for a selected method that explicitly reports non-hosted order capability; hosted payment remains outside the starter.

Local browser tests run against a deliberately small deterministic mock server. That server is test infrastructure only and is never bundled as an application fallback. Deployed-fixture qualification remains a separate fail-closed gate.
