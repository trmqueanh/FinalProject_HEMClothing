-- Store customer-facing color product codes directly on product_inventory.
--
-- One product color can have multiple size rows. The same product_code is
-- intentionally duplicated across those size rows to keep the model simple:
-- product_inventory = color + size + stock + color-level product code.
--
-- This migration does not drop legacy columns or tables.

BEGIN;

ALTER TABLE product_inventory
    ADD COLUMN IF NOT EXISTS product_code VARCHAR(160),
    ADD COLUMN IF NOT EXISTS article_number VARCHAR(160);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'product_color_variants'
    ) THEN
        UPDATE product_inventory pi
        SET
            product_code = COALESCE(NULLIF(TRIM(pi.product_code), ''), pcv.product_code),
            article_number = COALESCE(NULLIF(TRIM(pi.article_number), ''), pcv.product_code),
            updated_at = now()
        FROM product_color_variants pcv
        WHERE pcv.deleted_at IS NULL
          AND pcv.product_id = pi.product_id
          AND LOWER(TRIM(pcv.color_name)) = LOWER(TRIM(pi.color_name))
          AND (
              pi.product_code IS NULL
              OR TRIM(pi.product_code) = ''
              OR pi.article_number IS NULL
              OR TRIM(pi.article_number) = ''
          );
    END IF;
END $$;

UPDATE product_inventory pi
SET
    product_code = COALESCE(
        NULLIF(TRIM(pi.product_code), ''),
        TRIM(BOTH '-' FROM UPPER(REGEXP_REPLACE(
            CONCAT_WS(
                '-',
                COALESCE(NULLIF(TRIM(p.slug), ''), NULLIF(TRIM(p.name), ''), SUBSTRING(p.id::text, 1, 8)),
                pi.color_name
            ),
            '[^A-Za-z0-9]+',
            '-',
            'g'
        )))
    ),
    article_number = COALESCE(
        NULLIF(TRIM(pi.article_number), ''),
        NULLIF(TRIM(pi.product_code), ''),
        TRIM(BOTH '-' FROM UPPER(REGEXP_REPLACE(
            CONCAT_WS(
                '-',
                COALESCE(NULLIF(TRIM(p.slug), ''), NULLIF(TRIM(p.name), ''), SUBSTRING(p.id::text, 1, 8)),
                pi.color_name
            ),
            '[^A-Za-z0-9]+',
            '-',
            'g'
        )))
    ),
    updated_at = now()
FROM products p
WHERE p.id = pi.product_id
  AND NULLIF(TRIM(COALESCE(pi.color_name, '')), '') IS NOT NULL
  AND (
      pi.product_code IS NULL
      OR TRIM(pi.product_code) = ''
      OR pi.article_number IS NULL
      OR TRIM(pi.article_number) = ''
  );

CREATE INDEX IF NOT EXISTS idx_product_inventory_product_code
    ON product_inventory(LOWER(TRIM(product_code)))
    WHERE product_code IS NOT NULL
      AND LENGTH(TRIM(product_code)) > 0;

CREATE INDEX IF NOT EXISTS idx_product_inventory_article_number
    ON product_inventory(LOWER(TRIM(article_number)))
    WHERE article_number IS NOT NULL
      AND LENGTH(TRIM(article_number)) > 0;

COMMENT ON COLUMN product_inventory.product_code IS
    'Customer-facing color-level product code duplicated across size rows for the same product color.';

COMMENT ON COLUMN product_inventory.article_number IS
    'Legacy alias for product_code retained only for compatibility.';

COMMIT;
