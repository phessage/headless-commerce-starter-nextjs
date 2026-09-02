# Sandbox data policy

Local test data is synthetic and lives only in the test mock server; the running starter never falls back to it. Do not clone a production database into a demo or test environment. If production-scale shapes are required, export through an approved pipeline that removes customers, addresses, orders, payment tokens, credentials, webhook secrets, analytics identifiers and merchant-private content; then validate anonymization before import.
