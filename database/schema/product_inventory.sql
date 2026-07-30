CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS product_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    color_variant_id UUID,
    color_name VARCHAR(80) NOT NULL,
    size_label VARCHAR(20) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    product_code VARCHAR(160),
    article_number VARCHAR(160),
    color_hex VARCHAR(20),
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    sold_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT inventory_stock_check CHECK (stock_quantity >= 0),
    CONSTRAINT inventory_reserved_check CHECK (reserved_quantity >= 0),
    CONSTRAINT inventory_sold_check CHECK (sold_quantity >= 0),
    CONSTRAINT inventory_reserved_not_over_stock_check CHECK (reserved_quantity <= stock_quantity),
    CONSTRAINT unique_product_color_size UNIQUE (product_id, color_name, size_label),
    CONSTRAINT fk_inventory_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_product_inventory_color_variant
        FOREIGN KEY (color_variant_id)
        REFERENCES product_color_variants(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_product_inventory_product_id
ON product_inventory(product_id);

CREATE INDEX IF NOT EXISTS idx_product_inventory_color_variant_id
ON product_inventory(color_variant_id);

CREATE INDEX IF NOT EXISTS idx_product_inventory_color_size
ON product_inventory(product_id, color_name, size_label);

CREATE INDEX IF NOT EXISTS idx_product_inventory_product_code
ON product_inventory(LOWER(TRIM(product_code)))
WHERE product_code IS NOT NULL AND LENGTH(TRIM(product_code)) > 0;

CREATE INDEX IF NOT EXISTS idx_product_inventory_article_number
ON product_inventory(LOWER(TRIM(article_number)))
WHERE article_number IS NOT NULL AND LENGTH(TRIM(article_number)) > 0;
