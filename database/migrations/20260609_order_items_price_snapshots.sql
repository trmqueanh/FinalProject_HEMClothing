ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS original_price_at_purchase NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pricing_mode_at_purchase VARCHAR(30) NOT NULL DEFAULT 'regular';

UPDATE order_items oi
SET
  original_price_at_purchase = CASE
    WHEN COALESCE(NULLIF(p.pricing_mode, ''), 'regular') = 'sale'
      AND COALESCE(p.original_price, 0) > oi.product_price
      THEN p.original_price
    ELSE oi.product_price
  END,
  pricing_mode_at_purchase = CASE
    WHEN COALESCE(NULLIF(p.pricing_mode, ''), 'regular') = 'sale'
      AND COALESCE(p.original_price, 0) > oi.product_price
      THEN 'sale'
    ELSE 'regular'
  END
FROM products p
WHERE p.id = oi.product_id
  AND (
    oi.original_price_at_purchase = 0
    OR oi.pricing_mode_at_purchase IS NULL
    OR oi.pricing_mode_at_purchase NOT IN ('regular', 'sale')
  );

UPDATE order_items
SET
  original_price_at_purchase = product_price,
  pricing_mode_at_purchase = 'regular'
WHERE original_price_at_purchase = 0
   OR pricing_mode_at_purchase IS NULL
   OR pricing_mode_at_purchase NOT IN ('regular', 'sale');

ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_original_price_at_purchase_check;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_original_price_at_purchase_check
  CHECK (original_price_at_purchase >= 0);

ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_pricing_mode_at_purchase_check;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_pricing_mode_at_purchase_check
  CHECK (pricing_mode_at_purchase IN ('regular', 'sale'));
