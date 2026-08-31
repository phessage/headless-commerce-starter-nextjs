# Architecture

The App Router renders the storefront shell and keeps the demo catalog behind a real HTTP route so browser tests cross a network boundary. In a qualified environment, replace `/api/products` with a server-side SDK adapter configured by `HEADLESS_API_URL`; confidential credentials must remain server-only.

The fixture API is deliberately small and deterministic. It proves UI composition and test wiring, not production platform compatibility.
