-- Align products with the current admin product workflow.
-- Product inventory is stored in product_inventory, and product media is stored in product_images.

ALTER TABLE products
ADD COLUMN IF NOT EXISTS editor_pick BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'featured'
  ) THEN
    EXECUTE 'UPDATE products SET editor_pick = COALESCE(featured, false) WHERE editor_pick = false';
  END IF;
END $$;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS pricing_mode VARCHAR(30) NOT NULL DEFAULT 'regular';

ALTER TABLE products
DROP CONSTRAINT IF EXISTS products_pricing_mode_check;

ALTER TABLE products
ADD CONSTRAINT products_pricing_mode_check
CHECK (pricing_mode IN ('regular', 'sale'));

ALTER TABLE products
DROP COLUMN IF EXISTS featured,
DROP COLUMN IF EXISTS new_arrival,
DROP COLUMN IF EXISTS primary_color,
DROP COLUMN IF EXISTS inventory,
DROP COLUMN IF EXISTS reserved_inventory,
DROP COLUMN IF EXISTS sold_quantity;

DROP INDEX IF EXISTS idx_products_featured;
DROP INDEX IF EXISTS idx_products_new_arrival;
DROP INDEX IF EXISTS idx_products_inventory;

CREATE INDEX IF NOT EXISTS idx_products_editor_pick
ON products(editor_pick);

CREATE INDEX IF NOT EXISTS idx_products_created_at
ON products(created_at);

CREATE INDEX IF NOT EXISTS idx_products_pricing_mode
ON products(pricing_mode);

CREATE INDEX IF NOT EXISTS idx_products_sold_count
ON products(sold_count);

CREATE INDEX IF NOT EXISTS idx_products_status
ON products(status);

ALTER TABLE product_inventory
DROP COLUMN IF EXISTS variant_image;

DROP INDEX IF EXISTS idx_product_images_one_primary;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_one_primary_per_color
ON product_images(product_id, COALESCE(color_name, ''))
WHERE is_primary = true;
