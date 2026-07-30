CREATE INDEX IF NOT EXISTS idx_orders_user_phone_created_at
  ON orders(user_id, shipping_phone, created_at DESC);
