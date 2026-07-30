ALTER TABLE products
  ADD COLUMN IF NOT EXISTS inventory INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reserved_inventory INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sold_quantity INTEGER NOT NULL DEFAULT 0;

ALTER TABLE products
DROP CONSTRAINT IF EXISTS products_inventory_check;

ALTER TABLE products
ADD CONSTRAINT products_inventory_check
CHECK (inventory >= 0);

ALTER TABLE products
DROP CONSTRAINT IF EXISTS products_reserved_inventory_check;

ALTER TABLE products
ADD CONSTRAINT products_reserved_inventory_check
CHECK (reserved_inventory >= 0);

ALTER TABLE products
DROP CONSTRAINT IF EXISTS products_sold_quantity_check;

ALTER TABLE products
ADD CONSTRAINT products_sold_quantity_check
CHECK (sold_quantity >= 0);

CREATE INDEX IF NOT EXISTS idx_products_inventory
ON products(inventory, reserved_inventory);

ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_order_status_check;

UPDATE orders
SET payment_status = CASE
  WHEN payment_status = 'unpaid' THEN 'pending'
  ELSE payment_status
END,
order_status = CASE
  WHEN order_status = 'confirmed' THEN 'processing'
  WHEN order_status = 'shipping' THEN 'shipped'
  WHEN order_status = 'refunded' THEN 'cancelled'
  ELSE order_status
END;

UPDATE orders
SET order_status = 'processing'
WHERE payment_method = 'bank_transfer'
  AND payment_status = 'paid'
  AND order_status = 'pending';

ALTER TABLE orders
ALTER COLUMN payment_status SET DEFAULT 'pending';

ALTER TABLE orders
ADD CONSTRAINT orders_payment_status_check
CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

ALTER TABLE orders
ADD CONSTRAINT orders_order_status_check
CHECK (order_status IN ('pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_product_color_size'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'unique_product_color_size'
    ) THEN
      ALTER TABLE product_inventory
        ADD CONSTRAINT unique_product_color_size UNIQUE USING INDEX unique_product_color_size;
    ELSE
      ALTER TABLE product_inventory
        ADD CONSTRAINT unique_product_color_size UNIQUE (product_id, color_name, size_label);
    END IF;
  END IF;
END $$;

UPDATE products p
SET inventory = summary.stock_quantity,
    reserved_inventory = summary.reserved_quantity,
    sold_quantity = summary.sold_quantity,
    updated_at = now()
FROM (
  SELECT
    product_id,
    COALESCE(SUM(stock_quantity), 0)::int AS stock_quantity,
    COALESCE(SUM(reserved_quantity), 0)::int AS reserved_quantity,
    COALESCE(SUM(sold_quantity), 0)::int AS sold_quantity
  FROM product_inventory
  GROUP BY product_id
) summary
WHERE p.id = summary.product_id;
