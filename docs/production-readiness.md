# Production readiness checklist

- Public API/OpenAPI contract deployed and versioned.
- Publishable browser credentials separated from server credentials.
- Tenant/store authorization verified by negative cross-tenant tests.
- Cart, checkout, idempotency and asynchronous operations implemented.
- Real test-environment Playwright run asserts requests and rendered outcomes.
- Accessibility, localization, caching, observability and security review complete.
- No production customer data or secrets present in demo/test environments.
