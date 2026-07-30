CREATE INDEX IF NOT EXISTS idx_orders_user_created_id
ON orders(user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status_created_id
ON orders(order_status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status_created_id
ON orders(payment_status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order_created_id
ON order_items(order_id, created_at ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_order_items_completed_product_lookup
ON order_items(product_id, product_name);

DO $$
BEGIN
  IF to_regclass('public.order_status_history') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_order_status_history_order_created_id
    ON order_status_history(order_id, created_at ASC, id ASC);
  END IF;

  IF to_regclass('public.return_requests') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_return_requests_order_created_id
    ON return_requests(order_id, created_at DESC, id DESC);
  END IF;
END $$;
