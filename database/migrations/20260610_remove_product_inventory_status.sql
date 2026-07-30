DROP INDEX IF EXISTS idx_product_inventory_status;

ALTER TABLE product_inventory
  DROP COLUMN IF EXISTS status;

UPDATE products
SET status = CASE
  WHEN LOWER(TRIM(COALESCE(status, ''))) = 'active' THEN 'active'
  ELSE 'inactive'
END;

ALTER TABLE products
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN status SET NOT NULL,
  DROP CONSTRAINT IF EXISTS products_status_check;

ALTER TABLE products
  ADD CONSTRAINT products_status_check
  CHECK (status IN ('active', 'inactive'));
