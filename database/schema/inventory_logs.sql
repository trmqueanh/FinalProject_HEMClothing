CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    variant_id UUID,
    type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    stock_before INTEGER,
    stock_after INTEGER,
    reserved_after INTEGER DEFAULT 0,
    sold_after INTEGER DEFAULT 0,
    note TEXT,
    created_by UUID,
    created_by_role VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT fk_inventory_logs_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_inventory_logs_variant
        FOREIGN KEY (variant_id)
        REFERENCES product_inventory(id)
        ON DELETE SET NULL,

    CONSTRAINT inventory_logs_type_check
        CHECK (type IN ('import', 'sold', 'sale', 'refund', 'return', 'return_restock', 'return_damaged', 'delivery_failed_return', 'adjustment', 'release_hold', 'reserve_hold', 'cancel'))
);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id
ON inventory_logs(product_id);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_variant_id
ON inventory_logs(variant_id);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at
ON inventory_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_by
ON inventory_logs(created_by);
