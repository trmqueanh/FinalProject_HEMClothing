-- H&M-style customer-facing product code model.
--
-- This migration is intentionally additive:
-- - Add color-level product codes without dropping existing data.
-- - Preserve color + size inventory behavior through existing inventory rows.

BEGIN;

CREATE TABLE IF NOT EXISTS product_color_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    color_name VARCHAR(100) NOT NULL,
    color_hex VARCHAR(20),
    product_code VARCHAR(160),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

ALTER TABLE product_color_variants
    ADD COLUMN IF NOT EXISTS product_id UUID,
    ADD COLUMN IF NOT EXISTS color_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS color_hex VARCHAR(20),
    ADD COLUMN IF NOT EXISTS product_code VARCHAR(160),
    ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_product_color_variants_product'
          AND conrelid = 'product_color_variants'::regclass
    ) THEN
        ALTER TABLE product_color_variants
            ADD CONSTRAINT fk_product_color_variants_product
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_product_color_variants_color_name_not_blank'
          AND conrelid = 'product_color_variants'::regclass
    ) THEN
        ALTER TABLE product_color_variants
            ADD CONSTRAINT chk_product_color_variants_color_name_not_blank
            CHECK (color_name IS NOT NULL AND LENGTH(TRIM(color_name)) > 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_product_color_variants_sort_order_non_negative'
          AND conrelid = 'product_color_variants'::regclass
    ) THEN
        ALTER TABLE product_color_variants
            ADD CONSTRAINT chk_product_color_variants_sort_order_non_negative
            CHECK (sort_order >= 0);
    END IF;
END $$;

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

WITH normalized_colors AS (
    SELECT
        pi.product_id,
        LOWER(TRIM(pi.color_name)) AS color_key,
        MIN(TRIM(pi.color_name)) AS color_name,
        MAX(NULLIF(TRIM(pi.color_hex), '')) AS color_hex,
        MIN(pi.created_at) AS first_seen_at
    FROM product_inventory pi
    WHERE NULLIF(TRIM(pi.color_name), '') IS NOT NULL
    GROUP BY pi.product_id, LOWER(TRIM(pi.color_name))
),
color_sources AS (
    SELECT
        product_id,
        color_key,
        color_name,
        color_hex,
        ROW_NUMBER() OVER (
            PARTITION BY product_id
            ORDER BY first_seen_at NULLS LAST, color_name
        ) - 1 AS sort_order
    FROM normalized_colors
),
base_codes AS (
    SELECT
        cs.product_id,
        cs.color_name,
        cs.color_hex,
        NULLIF(
            TRIM(BOTH '-' FROM UPPER(REGEXP_REPLACE(
                CONCAT_WS(
                    '-',
                    COALESCE(
                        NULLIF(TRIM(p.slug), ''),
                        NULLIF(TRIM(p.name), ''),
                        SUBSTRING(p.id::text, 1, 8)
                    ),
                    cs.color_name
                ),
                '[^A-Za-z0-9]+',
                '-',
                'g'
            ))),
            ''
        ) AS base_product_code,
        cs.sort_order
    FROM color_sources cs
    INNER JOIN products p ON p.id = cs.product_id
),
generated_codes AS (
    SELECT
        product_id,
        color_name,
        color_hex,
        CASE
            WHEN COUNT(*) OVER (PARTITION BY LOWER(base_product_code)) > 1
                THEN CONCAT(base_product_code, '-', SUBSTRING(product_id::text, 1, 8))
            ELSE base_product_code
        END AS product_code,
        sort_order
    FROM base_codes
)
INSERT INTO product_color_variants (
    product_id,
    color_name,
    color_hex,
    product_code,
    sort_order
)
SELECT
    product_id,
    color_name,
    color_hex,
    product_code,
    sort_order
FROM generated_codes
ON CONFLICT DO NOTHING;

ALTER TABLE product_inventory
    ADD COLUMN IF NOT EXISTS color_variant_id UUID;

ALTER TABLE product_images
    ADD COLUMN IF NOT EXISTS color_variant_id UUID;

ALTER TABLE cart_items
    ADD COLUMN IF NOT EXISTS color_variant_id UUID;

ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS color_variant_id UUID,
    ADD COLUMN IF NOT EXISTS product_code_at_purchase VARCHAR(160),
    ADD COLUMN IF NOT EXISTS article_number_at_purchase VARCHAR(160);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_product_inventory_color_variant'
          AND conrelid = 'product_inventory'::regclass
    ) THEN
        ALTER TABLE product_inventory
            ADD CONSTRAINT fk_product_inventory_color_variant
            FOREIGN KEY (color_variant_id) REFERENCES product_color_variants(id)
            ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_product_images_color_variant'
          AND conrelid = 'product_images'::regclass
    ) THEN
        ALTER TABLE product_images
            ADD CONSTRAINT fk_product_images_color_variant
            FOREIGN KEY (color_variant_id) REFERENCES product_color_variants(id)
            ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_cart_items_color_variant'
          AND conrelid = 'cart_items'::regclass
    ) THEN
        ALTER TABLE cart_items
            ADD CONSTRAINT fk_cart_items_color_variant
            FOREIGN KEY (color_variant_id) REFERENCES product_color_variants(id)
            ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_order_items_color_variant'
          AND conrelid = 'order_items'::regclass
    ) THEN
        ALTER TABLE order_items
            ADD CONSTRAINT fk_order_items_color_variant
            FOREIGN KEY (color_variant_id) REFERENCES product_color_variants(id)
            ON DELETE SET NULL;
    END IF;
END $$;

UPDATE product_inventory pi
SET color_variant_id = pcv.id
FROM product_color_variants pcv
WHERE pi.color_variant_id IS NULL
  AND pcv.product_id = pi.product_id
  AND LOWER(TRIM(pcv.color_name)) = LOWER(TRIM(pi.color_name))
  AND pcv.deleted_at IS NULL;

UPDATE product_images img
SET color_variant_id = pcv.id
FROM product_color_variants pcv
WHERE img.color_variant_id IS NULL
  AND NULLIF(TRIM(img.color_name), '') IS NOT NULL
  AND pcv.product_id = img.product_id
  AND LOWER(TRIM(pcv.color_name)) = LOWER(TRIM(img.color_name))
  AND pcv.deleted_at IS NULL;

UPDATE cart_items ci
SET color_variant_id = pcv.id
FROM product_color_variants pcv
WHERE ci.color_variant_id IS NULL
  AND NULLIF(TRIM(ci.color_name), '') IS NOT NULL
  AND pcv.product_id = ci.product_id
  AND LOWER(TRIM(pcv.color_name)) = LOWER(TRIM(ci.color_name))
  AND pcv.deleted_at IS NULL;

UPDATE order_items oi
SET
    color_variant_id = pcv.id,
    product_code_at_purchase = COALESCE(oi.product_code_at_purchase, pcv.product_code),
    article_number_at_purchase = COALESCE(oi.article_number_at_purchase, pcv.product_code)
FROM product_inventory pi
INNER JOIN product_color_variants pcv ON pcv.id = pi.color_variant_id
WHERE oi.variant_id = pi.id
  AND oi.color_variant_id IS NULL
  AND pcv.deleted_at IS NULL;

UPDATE order_items oi
SET
    color_variant_id = pcv.id,
    product_code_at_purchase = COALESCE(oi.product_code_at_purchase, pcv.product_code),
    article_number_at_purchase = COALESCE(oi.article_number_at_purchase, pcv.product_code)
FROM product_color_variants pcv
WHERE oi.color_variant_id IS NULL
  AND NULLIF(TRIM(oi.color_name), '') IS NOT NULL
  AND pcv.product_id = oi.product_id
  AND LOWER(TRIM(pcv.color_name)) = LOWER(TRIM(oi.color_name))
  AND pcv.deleted_at IS NULL;

UPDATE order_items oi
SET
    product_code_at_purchase = COALESCE(oi.product_code_at_purchase, pcv.product_code),
    article_number_at_purchase = COALESCE(oi.article_number_at_purchase, pcv.product_code)
FROM product_color_variants pcv
WHERE oi.color_variant_id = pcv.id
  AND (
      oi.product_code_at_purchase IS NULL
      OR oi.article_number_at_purchase IS NULL
  )
  AND pcv.deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_inventory_color_variant_id
    ON product_inventory(color_variant_id);

CREATE INDEX IF NOT EXISTS idx_product_images_color_variant_id
    ON product_images(color_variant_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_color_variant_id
    ON cart_items(color_variant_id);

CREATE INDEX IF NOT EXISTS idx_order_items_color_variant_id
    ON order_items(color_variant_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_code_at_purchase
    ON order_items(product_code_at_purchase)
    WHERE product_code_at_purchase IS NOT NULL;

COMMENT ON TABLE product_color_variants IS
    'Customer-facing color variants. Each product color has its own product code; sizes remain inventory rows.';

COMMENT ON COLUMN product_color_variants.product_code IS
    'Customer-facing color-level product code shown on product, cart, checkout, and order screens.';

COMMENT ON COLUMN order_items.product_code_at_purchase IS
    'Snapshot of the customer-facing color-level product code at order time.';

COMMENT ON COLUMN order_items.article_number_at_purchase IS
    'Legacy alias snapshot retained for compatibility.';

COMMIT;
