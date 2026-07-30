ALTER TABLE products
ADD COLUMN IF NOT EXISTS pricing_mode VARCHAR(30) NOT NULL DEFAULT 'regular';

UPDATE products
SET pricing_mode = CASE
    WHEN COALESCE(is_sale, false) = true THEN 'sale'
    ELSE 'regular'
  END
WHERE pricing_mode IS NULL
   OR pricing_mode NOT IN ('regular', 'sale');

ALTER TABLE products
DROP CONSTRAINT IF EXISTS products_pricing_mode_check;

ALTER TABLE products
ADD CONSTRAINT products_pricing_mode_check
CHECK (pricing_mode IN ('regular', 'sale'));

ALTER TABLE products
DROP CONSTRAINT IF EXISTS fk_products_badge;

ALTER TABLE products
DROP COLUMN IF EXISTS badge_id;

CREATE INDEX IF NOT EXISTS idx_products_pricing_mode
ON products(pricing_mode);

CREATE INDEX IF NOT EXISTS idx_products_new_arrival
ON products(new_arrival);

CREATE INDEX IF NOT EXISTS idx_products_sold_count
ON products(sold_count);

DROP TABLE IF EXISTS badges;
