# CargoLedger Backend

[![CI](https://github.com/CodeGirlsInc/CargoLedger/actions/workflows/ci.yml/badge.svg)](https://github.com/CodeGirlsInc/CargoLedger/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

Express + TypeScript API for the **CargoLedger** decentralized logistics and freight management platform on the Stellar network.

CargoLedger modernizes traditional freight operations by integrating blockchain and Web3 principles into logistics workflows. This repository is the backend API layer: it exposes REST endpoints for shipment CRUD, a WebSocket channel for real-time shipment updates, webhook signature verification helpers, and an indexer state machine with chain-reorg safety — all built on Stellar.

---

## Table of Contents

- [About](#about)
- [Quick Start with Docker Compose](#quick-start-with-docker-compose)
- [Local Setup](#local-setup)
- [Local Setup with Stellar Testnet](#local-setup-with-stellar-testnet)
- [API Reference](#api-reference)
- [Decimal String Serialization Policy](#decimal-string-serialization-policy)
- [WebSocket API](#websocket-api)
- [Webhook Signature Verification](#webhook-signature-verification)
- [Indexer & Chain-Reorg Safety](#indexer--chain-reorg-safety)
- [Security Headers](#security-headers)
- [Production Docker Image](#production-docker-image)
- [Database Backups](#database-backups)
- [Load Testing (k6)](#load-testing-k6)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Current Status](#current-status)
- [Contributing](#contributing)

---

## About

CargoLedger aims to modernize traditional freight operations by incorporating blockchain and Web3 principles into logistics workflows. It provides tools and interfaces that improve traceability, automate core logistics processes, and offer enhanced data provenance for shipment actions across the ecosystem.

**Key features:**

- Freight & Shipment Management — build and track freight jobs from origin to destination
- Web3 Integration — Stellar smart contracts for secure, auditable freight events
- Real-time Updates — WebSocket channel for live shipment state changes
- Webhook Delivery — HMAC-SHA256 signed webhook events for downstream consumers
- Chain-Reorg Safety — indexer with automatic rollback on Stellar ledger reorgs
- Production-Ready — non-root Docker image, health checks, structured JSON logging

---

## Quick Start with Docker Compose

```bash
# 1. Clone
git clone https://github.com/CodeGirlsInc/CargoLedger.git
cd CargoLedger/backend

# 2. Configure environment
cp .env.example .env
# Edit .env — set CARGOLEDGER_WEBHOOK_SECRET, JWT_SECRET, etc.

# 3. Start with PostgreSQL
docker-compose up -d

# 4. Or start with PostgreSQL + Redis
docker-compose --profile redis up -d

# 5. Verify
curl http://localhost:3000/health
```

### Docker Compose Services

| Service    | Description                    | Default URL           |
|------------|--------------------------------|-----------------------|
| `app`      | CargoLedger Backend API        | http://localhost:3000 |
| `postgres` | PostgreSQL 16 database         | localhost:5432        |
| `redis`    | Redis 7 cache (optional)       | localhost:6379        |

All services include health checks. The app waits for PostgreSQL to be healthy before starting.

### Troubleshooting

```bash
docker-compose down -v          # reset everything (destroys data)
docker-compose up -d --build    # rebuild after code changes
docker-compose logs postgres    # database logs
docker-compose exec postgres psql -U cargoledger -d cargoledger
```

---

## Local Setup

**Prerequisites:** Node.js 18+, npm

```bash
npm install
cp .env.example .env
npm run dev        # tsx watch — API at http://localhost:3000
```

### Scripts

| Command                | Description                              |
|------------------------|------------------------------------------|
| `npm run dev`          | Run with tsx watch (hot reload)          |
| `npm run build`        | Compile TypeScript to `dist/`            |
| `npm start`            | Run compiled `dist/index.js`             |
| `npm test`             | Run full test suite with coverage        |
| `npm run typecheck`    | TypeScript type check (no emit)          |
| `npm run lint`         | ESLint                                   |
| `npm run docker:build` | Build production container image         |
| `npm run docker:run`   | Run production container locally         |
| `npm run docker:smoke` | Container health smoke test              |
| `npm run k6:smoke`     | k6 smoke load test                       |
| `npm run k6:load`      | k6 load test                             |
| `npm run k6:stress`    | k6 stress test                           |
| `npm run k6:soak`      | k6 soak test                             |

---

## Local Setup with Stellar Testnet

The Stellar testnet mirrors mainnet behaviour using test XLM with no real value. It resets roughly every 3 months.

**Testnet Horizon endpoint:** `https://horizon-testnet.stellar.org`

### 1. Generate a testnet keypair

```bash
# Using Stellar CLI
stellar keys generate --network testnet dev-account

# Or fund any keypair via Friendbot
curl "https://friendbot.stellar.org?addr=<YOUR_PUBLIC_KEY>"
```

Alternatively, use [Stellar Laboratory](https://laboratory.stellar.org) to generate and fund a keypair.

### 2. Verify the account

```bash
curl "https://horizon-testnet.stellar.org/accounts/<YOUR_PUBLIC_KEY>" | jq .
```

A 404 means the account is not yet funded — run Friendbot first.

### 3. Create a test shipment

```bash
curl -X POST http://localhost:3000/api/shipments \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
    "recipient": "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZCP2J7F1NRQKQOHP3OGN",
    "freightAmount": "5000.0000000",
    "ratePerKg": "0.0025000",
    "origin": "Lagos, Nigeria",
    "destination": "Nairobi, Kenya",
    "scheduledAt": 1700000000
  }'
```

---

## API Reference

| Method   | Path                    | Description                        |
|----------|-------------------------|------------------------------------|
| `GET`    | `/`                     | API info                           |
| `GET`    | `/health`               | Health + indexer status            |
| `GET`    | `/api/shipments`        | List shipments (filterable)        |
| `GET`    | `/api/shipments/:id`    | Get one shipment                   |
| `POST`   | `/api/shipments`        | Create shipment                    |
| `DELETE` | `/api/shipments/:id`    | Cancel shipment                    |

### Query Filters — `GET /api/shipments`

| Parameter   | Type   | Description                                              |
|-------------|--------|----------------------------------------------------------|
| `status`    | string | `pending` \| `in_transit` \| `delivered` \| `cancelled` |
| `sender`    | string | Stellar public key (G...)                                |
| `recipient` | string | Stellar public key (G...)                                |

### Create Shipment — `POST /api/shipments`

| Field           | Type   | Required | Description                              |
|-----------------|--------|----------|------------------------------------------|
| `sender`        | string | Yes      | Stellar public key of the freight payer  |
| `recipient`     | string | Yes      | Stellar public key of the freight payee  |
| `freightAmount` | string | Yes      | Total freight value as decimal string    |
| `ratePerKg`     | string | Yes      | Per-kilogram rate as decimal string      |
| `origin`        | string | Yes      | Shipment origin location                 |
| `destination`   | string | Yes      | Shipment destination location            |
| `scheduledAt`   | number | Yes      | Scheduled departure as Unix timestamp    |

---

## Decimal String Serialization Policy

All amounts crossing the chain/API boundary are serialized as **decimal strings** to prevent floating-point precision loss in JSON.

**Amount fields:**
- `freightAmount` — e.g. `"5000.0000000"`
- `ratePerKg` — e.g. `"0.0025000"`

Native JSON numbers are rejected. Validation error codes:

| Code                     | Description                                      |
|--------------------------|--------------------------------------------------|
| `DECIMAL_INVALID_TYPE`   | Amount was not a string                          |
| `DECIMAL_INVALID_FORMAT` | String did not match decimal notation            |
| `DECIMAL_OUT_OF_RANGE`   | Value exceeds maximum supported precision        |
| `DECIMAL_EMPTY_VALUE`    | Amount was empty or null                         |

---

## WebSocket API

**Endpoint:** `ws://<host>/ws/shipments`

All messages are JSON text frames. Binary frames are rejected.

### Client → Server

| Message | Description |
|---------|-------------|
| `{ "type": "subscribe", "shipmentId": "<id>" }` | Subscribe to a shipment |
| `{ "type": "unsubscribe", "shipmentId": "<id>" }` | Unsubscribe from a shipment |

### Server → Client

| Message | Description |
|---------|-------------|
| `{ "type": "shipment_update", "shipmentId": "<id>", "eventId": "<id>", "payload": {...} }` | Shipment state change |
| `{ "type": "error", "code": "<CODE>", "message": "<text>" }` | Protocol error |

### Error Codes

| Code                  | Cause                                        |
|-----------------------|----------------------------------------------|
| `PAYLOAD_TOO_LARGE`   | Inbound message exceeds 4 096 bytes          |
| `RATE_LIMIT_EXCEEDED` | More than 30 messages in a 10-second window  |
| `BINARY_NOT_SUPPORTED`| Binary frame received                        |
| `INVALID_JSON`        | Message is not valid JSON                    |
| `INVALID_MESSAGE`     | Missing or invalid `shipmentId`              |
| `UNKNOWN_TYPE`        | Unrecognised `type` field                    |

### Operational Notes

- **Rate limiting:** 30 inbound messages per 10-second window. Excess messages receive `RATE_LIMIT_EXCEEDED`; connection stays open.
- **Deduplication:** Events are identified by `(shipmentId, eventId)`. The dedup cache holds up to 10 000 entries (LRU eviction).
- **Heartbeat:** Ping/pong every 30 seconds. Unresponsive clients are terminated.
- **Graceful shutdown:** `StreamHub.close()` drains connections cleanly on `SIGTERM`/`SIGINT`.

### Browser Example

```js
const ws = new WebSocket('ws://localhost:3000/ws/shipments');

ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'subscribe', shipmentId: 'shipment-abc123' }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'shipment_update') {
    console.log('Update for', msg.shipmentId, msg.payload);
  }
};
```

---

## Webhook Signature Verification

### Headers

| Header                           | Meaning                                                      |
|----------------------------------|--------------------------------------------------------------|
| `x-cargoledger-delivery-id`      | Stable ID for deduplication                                  |
| `x-cargoledger-timestamp`        | Unix timestamp in seconds                                    |
| `x-cargoledger-signature`        | Hex-encoded `HMAC-SHA256(secret, timestamp + "." + rawBody)` |
| `x-cargoledger-event`            | Event name e.g. `shipment.created`                           |

### Canonical Signing Payload

```
${timestamp}.${rawRequestBody}
```

### Verification Rules

- Use raw request bytes exactly as received
- Reject payloads larger than 256 KiB
- Reject timestamps outside a 300-second tolerance window
- Compare signatures with constant-time equality
- Deduplicate on `x-cargoledger-delivery-id`

### Consumer Example

```ts
import { verifyWebhookSignature } from './src/webhooks/signature.js';

const result = verifyWebhookSignature({
  secret: process.env.CARGOLEDGER_WEBHOOK_SECRET,
  deliveryId: req.header('x-cargoledger-delivery-id') ?? undefined,
  timestamp: req.header('x-cargoledger-timestamp') ?? undefined,
  signature: req.header('x-cargoledger-signature') ?? undefined,
  rawBody,
  isDuplicateDelivery: (id) => seenDeliveryIds.has(id),
});

if (!result.ok) {
  return res.status(result.status).json({ error: result.code, message: result.message });
}
```

### Failure Modes

| Condition                                   | Expected Result        | HTTP Status |
|---------------------------------------------|------------------------|-------------|
| Missing secret in consumer config           | Configuration failure  | 500         |
| Missing delivery ID / timestamp / signature | Unauthenticated        | 401         |
| Non-numeric timestamp                       | Invalid input          | 400         |
| Stale timestamp                             | Replay risk            | 401         |
| Signature mismatch                          | Unauthenticated        | 401         |
| Payload > 256 KiB                           | Rejected before parse  | 413         |
| Duplicate delivery ID                       | Safe dedupe            | 409         |

---

## Indexer & Chain-Reorg Safety

The indexer tracks the last processed Stellar ledger and enforces a safety margin before reporting `lastSafeLedger`.

- **Chain tip safety:** `lastSafeLedger` lags the current tip by `INDEXER_SAFETY_MARGIN_LEDGERS` (default: 1)
- **Reorg detection:** If an incoming ledger number matches a previously indexed ledger but with a different hash, a reorg is detected and state is rolled back
- **Health reporting:** `GET /health` includes `indexer.status`, `lagMs`, `lastSafeLedger`, and `reorgDetected`

### Indexer Status Values

| Status           | Meaning                                          |
|------------------|--------------------------------------------------|
| `healthy`        | Receiving ledgers within the stall threshold     |
| `starting`       | No ledgers ingested yet                          |
| `stalled`        | No update within `INDEXER_STALL_THRESHOLD_MS`    |
| `not_configured` | Indexer has never received a ledger              |

---

## Security Headers

Helmet middleware is applied before all route handlers, ensuring every HTTP response carries:

- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options`
- `X-Powered-By` is removed

Verify manually:

```bash
curl -I http://127.0.0.1:3000/health
```

---

## Production Docker Image

```bash
npm run docker:build   # builds cargoledger-backend:local
npm run docker:smoke   # starts container, polls /health, exits
```

The container:
- Runs as a non-root user (`cargoledger`)
- Exposes only port 3000
- Includes a `HEALTHCHECK` against `GET /health`
- Fails fast on boot errors (non-zero exit → orchestrator restart)

---

## Database Backups

```ts
import { backupDatabase, restoreDatabase } from './src/db/backup.js';

// Backup
const result = await backupDatabase(process.env.DATABASE_URL, '/backups');

// Restore
const result = await restoreDatabase(process.env.DATABASE_URL, '/backups/cargoledger-backup-2024-01-01.dump');
```

Dumps use PostgreSQL custom format (`-F c`). Restore uses `--clean` to guarantee exact snapshot state.

---

## Load Testing (k6)

```bash
npm run k6:smoke    # 1 VU, 30s
npm run k6:load     # ramp to 20 VUs over 5m
npm run k6:stress   # ramp to 100 VUs over 9m
npm run k6:soak     # 20 VUs for 40m
```

---

## Environment Variables

| Variable                          | Default                               | Required              |
|-----------------------------------|---------------------------------------|-----------------------|
| `PORT`                            | `3000`                                | No                    |
| `LOG_LEVEL`                       | `info`                                | No                    |
| `HORIZON_URL`                     | `https://horizon-testnet.stellar.org` | Yes                   |
| `NETWORK_PASSPHRASE`              | `Test SDF Network ; September 2015`   | Yes                   |
| `DATABASE_URL`                    | —                                     | For persistent mode   |
| `REDIS_URL`                       | —                                     | Optional              |
| `CARGOLEDGER_WEBHOOK_SECRET`      | —                                     | For webhook delivery  |
| `JWT_SECRET`                      | —                                     | For auth (future)     |
| `INDEXER_STALL_THRESHOLD_MS`      | `60000`                               | No                    |
| `INDEXER_SAFETY_MARGIN_LEDGERS`   | `1`                                   | No                    |

---

## Project Structure

```
src/
  index.ts              # Express app, HTTP server, WebSocket setup, graceful shutdown
  routes/
    root.ts             # GET /
    health.ts           # GET /health
    shipments.ts        # GET|POST|DELETE /api/shipments
  middleware/
    requestId.ts        # x-request-id header injection
    requestLogger.ts    # structured JSON request logging
    errorHandler.ts     # global error handler
  decimal/
    validate.ts         # decimal string validation
  store/
    shipments.ts        # in-memory shipment store
  webhooks/
    signature.ts        # HMAC-SHA256 signing and verification
  indexer/
    state.ts            # ledger ingestion, reorg detection, health snapshot
  ws/
    hub.ts              # WebSocket hub: subscriptions, rate limiting, dedup, broadcast
  db/
    backup.ts           # pg_dump / pg_restore wrappers
tests/
  health.test.ts
  shipments.test.ts
  webhook.test.ts
  decimal.test.ts
  ws.test.ts
  indexer.test.ts
  helmet.test.ts
k6/
  main.js               # k6 entrypoint
  config.js             # thresholds and stage profiles
  scenarios/
    health.js
    shipments.js
init-db/
  01-schema.sql         # PostgreSQL schema (auto-run on first container start)
scripts/
  smoke.sh              # Docker smoke test script
.github/workflows/
  ci.yml                # Lint + typecheck + test + docker smoke on every PR
  release.yml           # Build and push to GHCR on version tags
  codeql.yml            # Weekly CodeQL security scan
```

---

## Current Status

**Implemented:**
- REST endpoints: `/`, `/health`, `/api/shipments` (list, get, create, cancel)
- Decimal string validation for all amount fields
- Indexer freshness classification (`healthy`, `starting`, `stalled`, `not_configured`)
- Chain-reorg detection and automatic rollback
- Webhook signing and verification helpers (`src/webhooks/signature.ts`)
- WebSocket hub for real-time shipment updates with rate limiting and deduplication
- Helmet security headers on all responses
- Structured JSON logging with request IDs
- Production Docker image (non-root, health check)
- PostgreSQL schema with shipments, indexer state, audit log, and webhook delivery tables
- Database backup/restore wrappers
- k6 load testing harness
- GitHub Actions CI/CD + CodeQL security scanning

**Not yet implemented:**
- Live webhook delivery endpoints
- Durable delivery logs or replay store
- Persistent database-backed shipment/indexer state (in-memory only today)
- Automated backup scheduling
- Request rate limiting middleware
- JWT/API-key authentication
- Stellar address validation against live Horizon

---

## Related Repositories

- [cargoledger-frontend](https://github.com/CodeGirlsInc/CargoLedger/tree/main/frontend) — Dashboard and shipper UI
- [cargoledger-contracts](https://github.com/CodeGirlsInc/CargoLedger/tree/main/contracts) — Soroban smart contracts

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md) for the vulnerability reporting policy.

## License

[Apache 2.0](LICENSE)
