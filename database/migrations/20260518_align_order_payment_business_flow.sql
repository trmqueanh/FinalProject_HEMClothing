BEGIN;

ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_order_status_check;

UPDATE orders
SET payment_status = CASE
  WHEN payment_status = 'pending' THEN 'unpaid'
  ELSE payment_status
END;

UPDATE orders
SET order_status = CASE
  WHEN order_status = 'shipped' THEN 'shipping'
  WHEN order_status = 'refunded' THEN 'cancelled'
  ELSE order_status
END;

UPDATE orders
SET order_status = 'confirmed'
WHERE payment_method = 'cod'
  AND order_status = 'pending'
  AND payment_status = 'unpaid';

ALTER TABLE orders
ADD CONSTRAINT orders_payment_status_check
CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refund_pending', 'refunded'));

ALTER TABLE orders
ADD CONSTRAINT orders_order_status_check
CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipping', 'delivered', 'completed', 'cancelled'));

COMMIT;
