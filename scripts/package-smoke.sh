#!/usr/bin/env bash
set -euo pipefail
archive="$(node scripts/package-customer.mjs)"
consumer_dir="$(mktemp -d)"
trap 'rm -rf "$consumer_dir"' EXIT
tar -xzf "$archive" -C "$consumer_dir"
cd "$consumer_dir"
npm ci --no-audit --no-fund
npm run build
printf 'Customer source archive installed and built: %s\n' "$archive"
