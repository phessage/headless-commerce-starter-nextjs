#!/usr/bin/env bash
set -euo pipefail
umask 077
api="https://api.1ecomm.com/operations/headless/e2e-fixtures"
mode="${HEADLESS_CART_MODE:-nonshipping}"
case "$mode" in nonshipping|physical|mixed) ;; *) echo "Unknown cart mode" >&2; exit 1;; esac
state="${RUNNER_TEMP:-/tmp}/headless-fixture-lease-$mode.json"
secondary="${state%.json}-secondary.json"
token="${HEADLESS_E2E_ALLOCATOR_TOKEN:-}"
[ -n "$token" ] || { echo "HEADLESS_E2E_ALLOCATOR_TOKEN is required" >&2; exit 1; }

allocate() {
  local file="$1" shipping="$2" suffix="$3"
  curl --fail --silent --show-error --retry 2 \
    -H "x-fixture-allocator-token: $token" -H 'content-type: application/json' \
    --data "$(jq -cn --arg runId "${GITHUB_REPOSITORY:-local}:${GITHUB_RUN_ID:-0}:${GITHUB_RUN_ATTEMPT:-0}:$mode:$suffix" --argjson requiresShipping "$shipping" '{runId:$runId,ttlMinutes:45,inventory:20,requiresShipping:$requiresShipping}')" \
    "$api/allocate" > "$file"
  for field in leaseId leaseToken storeId publishableKey productId variantId; do jq -er ".$field | strings | select(length > 0)" "$file" >/dev/null; done
  echo "::add-mask::$(jq -r '.leaseToken' "$file")"
  echo "::add-mask::$(jq -r '.publishableKey' "$file")"
  jq -e --argjson expected "$shipping" '.requiresShipping == $expected' "$file" >/dev/null
  echo "Allocated isolated $mode fixture lease $(jq -r '.leaseId' "$file")"
}

if [ "${1:-}" = "allocate" ]; then
  allocate "$state" "${HEADLESS_REQUIRE_SHIPPING:-false}" primary
  {
    echo "HEADLESS_LEASE_ID=$(jq -r '.leaseId' "$state")"
    echo "HEADLESS_LEASE_TOKEN=$(jq -r '.leaseToken' "$state")"
    echo "HEADLESS_STORE_ID=$(jq -r '.storeId' "$state")"
    echo "HEADLESS_PUBLISHABLE_KEY=$(jq -r '.publishableKey' "$state")"
    echo "HEADLESS_PRODUCT_ID=$(jq -r '.productId' "$state")"
    echo "HEADLESS_VARIANT_ID=$(jq -r '.variantId' "$state")"
    echo "HEADLESS_API_URL=https://api.1ecomm.com"
  } >> "$GITHUB_ENV"
  if [ "$mode" = mixed ]; then
    allocate "$secondary" false secondary
    test "$(jq -r '.storeId' "$state")" = "$(jq -r '.storeId' "$secondary")"
    {
      echo "HEADLESS_SECOND_PRODUCT_ID=$(jq -r '.productId' "$secondary")"
      echo "HEADLESS_SECOND_VARIANT_ID=$(jq -r '.variantId' "$secondary")"
    } >> "$GITHUB_ENV"
  fi
elif [ "${1:-}" = "release" ]; then
  failed=0
  for file in "$state" "$secondary"; do
    [ -s "$file" ] || continue
    if ! curl --fail --silent --show-error --retry 2 \
      -H "x-fixture-allocator-token: $token" \
      -H "x-fixture-lease-token: $(jq -r '.leaseToken' "$file")" \
      -H 'content-type: application/json' --data "$(jq -c '{leaseId}' "$file")" "$api/release" >/dev/null; then
      failed=1
      continue
    fi
    echo "Released isolated fixture lease $(jq -r '.leaseId' "$file")"
    rm -f "$file"
  done
  exit "$failed"
else
  echo "usage: $0 allocate|release" >&2
  exit 2
fi
