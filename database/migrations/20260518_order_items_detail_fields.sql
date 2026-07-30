ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS product_image TEXT,
    ADD COLUMN IF NOT EXISTS variant_id UUID,
    ADD COLUMN IF NOT EXISTS price_at_purchase NUMERIC(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

ALTER TABLE order_items
    DROP CONSTRAINT IF EXISTS fk_order_items_variant;

ALTER TABLE order_items
    ADD CONSTRAINT fk_order_items_variant
    FOREIGN KEY (variant_id)
    REFERENCES product_inventory(id)
    ON DELETE SET NULL;

ALTER TABLE order_items
    DROP CONSTRAINT IF EXISTS order_items_reserved_quantity_check;

ALTER TABLE order_items
    ADD CONSTRAINT order_items_reserved_quantity_check
    CHECK (reserved_quantity >= 0);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
ON order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_id
ON order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_order_items_variant_id
ON order_items(variant_id);
