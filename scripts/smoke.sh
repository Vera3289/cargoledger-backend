#!/usr/bin/env bash
set -euo pipefail

IMAGE="cargoledger-backend:local"
PORT=3099
CONTAINER=""

cleanup() {
  if [ -n "$CONTAINER" ]; then
    docker stop "$CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

echo "Starting container..."
CONTAINER=$(docker run -d --rm -p "${PORT}:3000" "$IMAGE")

echo "Waiting for health endpoint..."
for i in $(seq 1 20); do
  if curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null; then
    echo "Health check passed."
    exit 0
  fi
  sleep 1
done

echo "Smoke test FAILED: health endpoint did not respond in time."
exit 1
