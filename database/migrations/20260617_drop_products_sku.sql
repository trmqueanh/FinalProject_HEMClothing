-- Remove main style SKU from products.
--
-- Customer-facing product codes are entered per color and stored on
-- product_inventory.product_code.

BEGIN;

ALTER TABLE IF EXISTS products
    DROP CONSTRAINT IF EXISTS products_sku_key;

DROP INDEX IF EXISTS products_sku_key;

ALTER TABLE IF EXISTS products
    DROP COLUMN IF EXISTS sku;

COMMIT;
