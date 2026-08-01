CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS cart_items (
    id UUID DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    size_label VARCHAR(20),
    color_name VARCHAR(80),
    color_variant_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT cart_items_pkey
        PRIMARY KEY (id),

    CONSTRAINT cart_items_cart_id_fkey
        FOREIGN KEY (cart_id)
        REFERENCES carts(id)
        ON DELETE CASCADE,

    CONSTRAINT cart_items_product_id_fkey
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cart_items_color_variant
        FOREIGN KEY (color_variant_id)
        REFERENCES product_color_variants(id)
        ON DELETE SET NULL,

    CONSTRAINT cart_items_quantity_check
        CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id
ON cart_items(cart_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_product_id
ON cart_items(product_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_color_variant_id
ON cart_items(color_variant_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_unique_variant
ON cart_items(cart_id, product_id, COALESCE(size_label, ''), color_variant_id)
WHERE color_variant_id IS NOT NULL;
