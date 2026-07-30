-- Remove confusing legacy customer-facing identifiers.
--
-- product_inventory no longer stores size-level SKU.
-- product_color_variants no longer stores article_number; product_code is the
-- single customer-facing code.

BEGIN;

ALTER TABLE IF EXISTS product_inventory
    DROP CONSTRAINT IF EXISTS product_inventory_sku_key;

DROP INDEX IF EXISTS product_inventory_sku_key;

ALTER TABLE IF EXISTS product_inventory
    DROP COLUMN IF EXISTS sku;

DROP INDEX IF EXISTS idx_product_color_variants_article_number_active;

ALTER TABLE IF EXISTS product_color_variants
    DROP COLUMN IF EXISTS article_number;

COMMIT;
