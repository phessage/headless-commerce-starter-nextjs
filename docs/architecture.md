# Architecture

The App Router renders the storefront shell and keeps catalog access behind a server-side `/api/products` adapter so browser tests cross a network boundary. When `HEADLESS_API_URL` and `HEADLESS_PUBLISHABLE_KEY` are configured, the adapter calls the platform `/v1/headless/products` contract without exposing the key to the browser. Without both variables it serves visibly marked synthetic fixtures.

Cart and checkout requests use a narrowly allowlisted Route Handler proxy. It forwards only the resolved publishable key, cart token, JSON content type, and—for the fixed order route—the caller's idempotency key. The UI enables placement only for a selected method that explicitly reports non-hosted order capability; hosted payment remains outside the starter.

The fixture API is deliberately small and deterministic. It proves UI composition and test wiring, not production platform compatibility.
