# Sandbox data policy

Demo data is synthetic and committed as code. Do not clone a production database into this environment. If production-scale shapes are required, export through an approved pipeline that removes customers, addresses, orders, payment tokens, credentials, webhook secrets, analytics identifiers and merchant-private content; then validate anonymization before import.
