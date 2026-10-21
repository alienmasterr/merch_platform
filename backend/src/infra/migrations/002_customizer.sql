CREATE TABLE custom_merch_products (
  id                TEXT PRIMARY KEY,
  base_item_id      TEXT NOT NULL REFERENCES apparel_items (id),
  print_configs     JSONB NOT NULL DEFAULT '[]'::jsonb,
  preview_image_url TEXT,
  mockup_approved   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_custom_merch_products_base_item ON custom_merch_products (base_item_id);
