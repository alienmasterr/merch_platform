CREATE TABLE categories (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE
);

CREATE TABLE apparel_items (
  id                 TEXT PRIMARY KEY,
  kind               TEXT NOT NULL CHECK (kind IN ('TOP', 'BOTTOM', 'ACCESSORY')),
  title              TEXT NOT NULL,
  base_price         NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
  size               TEXT NOT NULL,
  color              TEXT NOT NULL,
  fabric_composition TEXT NOT NULL DEFAULT '',
  in_stock           BOOLEAN NOT NULL DEFAULT TRUE,
  category_id        TEXT NOT NULL REFERENCES categories (id),
  has_hood           BOOLEAN,
  has_pockets        BOOLEAN,
  waist_cm           NUMERIC(6, 2),
  length_cm          NUMERIC(6, 2),
  accessory_type     TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_apparel_items_category ON apparel_items (category_id);
CREATE INDEX idx_apparel_items_price ON apparel_items (base_price);
