CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS product_color_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    color_name VARCHAR(100) NOT NULL,
    color_hex VARCHAR(20),
    color_family VARCHAR(40),
    product_code VARCHAR(160),
    sale_price NUMERIC(10, 2),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_product_color_variants_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_product_color_variants_color_name_not_blank
        CHECK (color_name IS NOT NULL AND LENGTH(TRIM(color_name)) > 0),
    CONSTRAINT chk_product_color_variants_sort_order_non_negative
        CHECK (sort_order >= 0),
    CONSTRAINT chk_product_color_variants_sale_price_non_negative
        CHECK (sale_price IS NULL OR sale_price >= 0),
    CONSTRAINT chk_product_color_variants_color_family_allowed
        CHECK (
            color_family IS NULL OR color_family IN (
                'Black',
                'White',
                'Gray',
                'Beige',
                'Brown',
                'Red',
                'Pink',
                'Purple',
                'Blue',
                'Green',
                'Yellow',
                'Orange',
                'Multi'
            )
        )
);

CREATE INDEX IF NOT EXISTS idx_product_color_variants_product_id
ON product_color_variants(product_id)
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_color_variants_product_color_active
ON product_color_variants(product_id, LOWER(TRIM(color_name)))
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_color_variants_product_code_active
ON product_color_variants(LOWER(TRIM(product_code)))
WHERE deleted_at IS NULL
  AND product_code IS NOT NULL
  AND LENGTH(TRIM(product_code)) > 0;

CREATE INDEX IF NOT EXISTS idx_product_color_variants_color_family
ON product_color_variants(color_family)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_color_variants_sale_price_active
ON product_color_variants(sale_price)
WHERE deleted_at IS NULL
  AND sale_price IS NOT NULL;
