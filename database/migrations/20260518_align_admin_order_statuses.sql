ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_order_status_check;

ALTER TABLE orders
ADD CONSTRAINT orders_order_status_check
CHECK (
  order_status IN (
    'pending',
    'confirmed',
    'processing',
    'shipping',
    'delivered',
    'completed',
    'cancelled',
    'refunded'
  )
);
