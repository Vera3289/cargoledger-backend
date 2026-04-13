-- CargoLedger Backend — Database Schema
-- Automatically applied by PostgreSQL on first container start

-- Shipments: core freight protocol state
CREATE TABLE IF NOT EXISTS shipments (
  id              TEXT PRIMARY KEY,
  sender          TEXT NOT NULL,
  recipient       TEXT NOT NULL,
  freight_amount  TEXT NOT NULL,   -- decimal string
  rate_per_kg     TEXT NOT NULL,   -- decimal string
  origin          TEXT NOT NULL,
  destination     TEXT NOT NULL,
  scheduled_at    BIGINT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'in_transit', 'delivered', 'cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at    TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_sender    ON shipments (sender);
CREATE INDEX IF NOT EXISTS idx_shipments_recipient ON shipments (recipient);
CREATE INDEX IF NOT EXISTS idx_shipments_status    ON shipments (status);
CREATE INDEX IF NOT EXISTS idx_shipments_origin    ON shipments (origin);
CREATE INDEX IF NOT EXISTS idx_shipments_destination ON shipments (destination);

-- Indexer state: tracks last processed Stellar ledger
CREATE TABLE IF NOT EXISTS indexer_state (
  id                SERIAL PRIMARY KEY,
  last_ledger       BIGINT NOT NULL,
  last_ledger_hash  TEXT NOT NULL,
  last_safe_ledger  BIGINT NOT NULL,
  reorg_detected    BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log: immutable record of chain-derived freight events
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  shipment_id TEXT REFERENCES shipments(id),
  event_type  TEXT NOT NULL,
  ledger      BIGINT,
  payload     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_shipment_id ON audit_log (shipment_id);
CREATE INDEX IF NOT EXISTS idx_audit_event_type  ON audit_log (event_type);

-- Webhook delivery tracking (future)
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  delivery_id   TEXT PRIMARY KEY,
  shipment_id   TEXT REFERENCES shipments(id),
  event_type    TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'delivered', 'failed')),
  attempts      INT NOT NULL DEFAULT 0,
  last_error    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at  TIMESTAMPTZ
);
