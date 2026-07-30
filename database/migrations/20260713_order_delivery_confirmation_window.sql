ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

UPDATE orders o
SET delivered_at = COALESCE(
  (
    SELECT MIN(osh.created_at)
    FROM order_status_history osh
    WHERE osh.order_id = o.id
      AND osh.new_status = 'delivered'
  ),
  o.updated_at
)
WHERE o.delivered_at IS NULL
  AND o.order_status IN ('delivered', 'completed');

CREATE INDEX IF NOT EXISTS idx_orders_delivered_at
ON orders(delivered_at);
