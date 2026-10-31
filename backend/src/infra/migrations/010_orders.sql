CREATE TABLE orders (
  id                     TEXT PRIMARY KEY,
  status                 TEXT NOT NULL
                         CHECK (status IN ('CREATED', 'PAID', 'PENDING_REVIEW', 'PRINTING', 'SHIPPED', 'CANCELLED')),
  recipient              JSONB NOT NULL,
  shipping_cost          NUMERIC(10, 2) NOT NULL CHECK (shipping_cost >= 0),
  ttn_number             TEXT,
  payment_transaction_id TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_status ON orders (status, created_at);

CREATE TABLE order_items (
  order_id          TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  position          INTEGER NOT NULL,
  custom_product_id TEXT NOT NULL REFERENCES custom_merch_products (id),
  quantity          INTEGER NOT NULL CHECK (quantity > 0),
  unit_price        NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  PRIMARY KEY (order_id, position)
);
