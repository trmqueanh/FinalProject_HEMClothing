CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE vouchers
  ADD COLUMN IF NOT EXISTS per_user_limit INTEGER DEFAULT 1;

ALTER TABLE vouchers
  DROP CONSTRAINT IF EXISTS vouchers_per_user_limit_check;

ALTER TABLE vouchers
  ADD CONSTRAINT vouchers_per_user_limit_check
  CHECK (per_user_limit IS NULL OR per_user_limit > 0);

CREATE TABLE IF NOT EXISTS voucher_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  voucher_code VARCHAR(100) NOT NULL,
  order_subtotal NUMERIC(12, 2) NOT NULL,
  discount_amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT voucher_redemptions_order_unique UNIQUE (order_id),
  CONSTRAINT voucher_redemptions_subtotal_check CHECK (order_subtotal >= 0),
  CONSTRAINT voucher_redemptions_discount_check CHECK (
    discount_amount >= 0
    AND discount_amount <= order_subtotal
  )
);

CREATE INDEX IF NOT EXISTS idx_voucher_redemptions_user_voucher
ON voucher_redemptions(user_id, voucher_id, created_at DESC);

INSERT INTO voucher_redemptions (
  voucher_id,
  user_id,
  order_id,
  voucher_code,
  order_subtotal,
  discount_amount,
  created_at
)
SELECT
  v.id,
  o.user_id,
  o.id,
  o.voucher_code,
  o.subtotal,
  o.discount_amount,
  o.created_at
FROM orders o
JOIN vouchers v ON UPPER(v.code) = UPPER(o.voucher_code)
WHERE COALESCE(o.voucher_code, '') <> ''
  AND COALESCE(o.discount_amount, 0) > 0
ON CONFLICT (order_id) DO NOTHING;
