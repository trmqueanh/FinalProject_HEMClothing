-- Make products.price the canonical active selling price.
-- original_price remains the compare/base price for sale products.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS is_sale BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pricing_mode VARCHAR(30) NOT NULL DEFAULT 'regular';

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_pricing_mode_check;

ALTER TABLE products
  ADD CONSTRAINT products_pricing_mode_check
  CHECK (pricing_mode IN ('regular', 'sale'));

WITH normalized AS (
  SELECT
    id,
    CASE
      WHEN pricing_mode = 'sale' OR COALESCE(is_sale, false) THEN 'sale'
      ELSE 'regular'
    END AS requested_mode,
    GREATEST(
      COALESCE(original_price, 0),
      COALESCE(price, 0),
      COALESCE(sale_price, 0)
    ) AS base_price
  FROM products
),
resolved AS (
  SELECT
    p.id,
    CASE
      WHEN n.requested_mode = 'sale'
        AND p.sale_price IS NOT NULL
        AND p.sale_price >= 0
        AND n.base_price > p.sale_price
        THEN 'sale'
      ELSE 'regular'
    END AS final_mode,
    n.base_price
  FROM products p
  JOIN normalized n ON n.id = p.id
)
UPDATE products p
SET
  pricing_mode = r.final_mode,
  original_price = r.base_price,
  price = CASE
    WHEN r.final_mode = 'sale' THEN p.sale_price
    ELSE r.base_price
  END,
  sale_price = CASE WHEN r.final_mode = 'sale' THEN p.sale_price ELSE NULL END,
  is_sale = r.final_mode = 'sale',
  updated_at = now()
FROM resolved r
WHERE p.id = r.id;

CREATE OR REPLACE FUNCTION public.products_apply_pricing_contract()
RETURNS trigger AS $$
BEGIN
  NEW.pricing_mode := COALESCE(NULLIF(NEW.pricing_mode, ''), 'regular');

  IF NEW.pricing_mode NOT IN ('regular', 'sale') THEN
    NEW.pricing_mode := 'regular';
  END IF;

  NEW.original_price := COALESCE(NEW.original_price, NEW.price, 0);

  IF NEW.pricing_mode = 'regular' THEN
    NEW.price := NEW.original_price;
    NEW.sale_price := NULL;
    NEW.is_sale := false;
  ELSIF NEW.pricing_mode = 'sale' THEN
    NEW.price := NEW.sale_price;
    NEW.is_sale := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_apply_pricing_contract_before_write ON products;

CREATE TRIGGER products_apply_pricing_contract_before_write
BEFORE INSERT OR UPDATE OF
  pricing_mode,
  price,
  original_price,
  sale_price,
  is_sale
ON products
FOR EACH ROW
EXECUTE FUNCTION public.products_apply_pricing_contract();

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_pricing_state_check;

ALTER TABLE products
  ADD CONSTRAINT products_pricing_state_check
  CHECK (
    (
      pricing_mode = 'regular'
      AND price = original_price
      AND sale_price IS NULL
      AND is_sale = false
    )
    OR
    (
      pricing_mode = 'sale'
      AND sale_price IS NOT NULL
      AND sale_price < original_price
      AND price = sale_price
      AND is_sale = true
    )
  );
