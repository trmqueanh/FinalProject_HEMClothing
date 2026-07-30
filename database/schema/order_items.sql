CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    product_id UUID NOT NULL,
    variant_id UUID,
    color_variant_id UUID,
    product_name VARCHAR(255) NOT NULL,
    product_code_at_purchase VARCHAR(160),
    article_number_at_purchase VARCHAR(160),
    product_price NUMERIC(10,2) NOT NULL,
    price_at_purchase NUMERIC(10,2) NOT NULL DEFAULT 0,
    original_price_at_purchase NUMERIC(10,2) NOT NULL DEFAULT 0,
    pricing_mode_at_purchase VARCHAR(30) NOT NULL DEFAULT 'regular',
    quantity INTEGER NOT NULL DEFAULT 1,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    size_label VARCHAR(20),
    color_name VARCHAR(80),
    product_image TEXT,
    gross_line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    item_discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    voucher_discount_allocated NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    refunded_quantity INTEGER NOT NULL DEFAULT 0,
    refunded_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_items_variant
        FOREIGN KEY (variant_id)
        REFERENCES product_inventory(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_items_color_variant
        FOREIGN KEY (color_variant_id)
        REFERENCES product_color_variants(id)
        ON DELETE SET NULL,

    CONSTRAINT order_items_quantity_check CHECK (quantity > 0),
    CONSTRAINT order_items_reserved_quantity_check CHECK (reserved_quantity >= 0),
    CONSTRAINT order_items_product_price_check CHECK (product_price >= 0),
    CONSTRAINT order_items_original_price_at_purchase_check CHECK (original_price_at_purchase >= 0),
    CONSTRAINT order_items_pricing_mode_at_purchase_check CHECK (pricing_mode_at_purchase IN ('regular', 'sale')),
    CONSTRAINT order_items_refunded_quantity_check CHECK (refunded_quantity >= 0 AND refunded_quantity <= quantity),
    CONSTRAINT order_items_refunded_amount_check CHECK (refunded_amount >= 0 AND refunded_amount <= net_line_total),
    CONSTRAINT order_items_refund_allocation_check CHECK (
      gross_line_total >= 0
      AND item_discount_amount >= 0
      AND voucher_discount_allocated >= 0
      AND net_line_total >= 0
      AND net_line_total + voucher_discount_allocated = gross_line_total
    )
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
ON order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_id
ON order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_order_items_variant_id
ON order_items(variant_id);

CREATE INDEX IF NOT EXISTS idx_order_items_color_variant_id
ON order_items(color_variant_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_code_at_purchase
ON order_items(product_code_at_purchase)
WHERE product_code_at_purchase IS NOT NULL;
