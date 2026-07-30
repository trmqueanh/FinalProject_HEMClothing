BEGIN;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(20),
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_cancelled_by_check;

ALTER TABLE orders
ADD CONSTRAINT orders_cancelled_by_check
CHECK (cancelled_by IN ('user', 'admin') OR cancelled_by IS NULL);

CREATE INDEX IF NOT EXISTS idx_orders_payment_method
ON orders(payment_method);

CREATE INDEX IF NOT EXISTS idx_orders_cancelled_at
ON orders(cancelled_at);

CREATE INDEX IF NOT EXISTS idx_orders_completed_at
ON orders(completed_at);

CREATE INDEX IF NOT EXISTS idx_orders_refunded_at
ON orders(refunded_at);

ALTER TABLE order_status_history
  ADD COLUMN IF NOT EXISTS changed_by_role VARCHAR(20);

ALTER TABLE order_status_history
DROP CONSTRAINT IF EXISTS order_status_history_old_status_check;

ALTER TABLE order_status_history
DROP CONSTRAINT IF EXISTS order_status_history_new_status_check;

ALTER TABLE order_status_history
DROP CONSTRAINT IF EXISTS order_status_history_role_check;

ALTER TABLE order_status_history
ADD CONSTRAINT order_status_history_old_status_check
CHECK (old_status IN ('pending', 'confirmed', 'processing', 'shipping', 'delivered', 'completed', 'cancelled') OR old_status IS NULL);

ALTER TABLE order_status_history
ADD CONSTRAINT order_status_history_new_status_check
CHECK (new_status IN ('pending', 'confirmed', 'processing', 'shipping', 'delivered', 'completed', 'cancelled'));

ALTER TABLE order_status_history
ADD CONSTRAINT order_status_history_role_check
CHECK (changed_by_role IN ('admin', 'user') OR changed_by_role IS NULL);

ALTER TABLE product_reviews
  ADD COLUMN IF NOT EXISTS order_id UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

UPDATE product_reviews pr
SET order_id = (
  SELECT o.id
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  WHERE o.user_id = pr.user_id
    AND oi.product_id = pr.product_id
    AND o.order_status = 'completed'
  ORDER BY o.updated_at DESC, o.created_at DESC
  LIMIT 1
)
WHERE pr.order_id IS NULL;

ALTER TABLE product_reviews
DROP CONSTRAINT IF EXISTS product_reviews_user_product_unique;

ALTER TABLE product_reviews
DROP CONSTRAINT IF EXISTS unique_user_order_product_review;

DELETE FROM product_reviews pr
WHERE pr.order_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM product_reviews newer
    WHERE newer.user_id = pr.user_id
      AND newer.product_id = pr.product_id
      AND newer.order_id IS NOT NULL
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM product_reviews
    WHERE order_id IS NULL
  ) THEN
    ALTER TABLE product_reviews ALTER COLUMN order_id SET NOT NULL;
  END IF;
END $$;

ALTER TABLE product_reviews
ADD CONSTRAINT unique_user_order_product_review
UNIQUE (user_id, order_id, product_id);

CREATE INDEX IF NOT EXISTS idx_product_reviews_order_id
ON product_reviews(order_id);

COMMIT;
