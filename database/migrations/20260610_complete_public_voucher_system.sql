UPDATE vouchers
SET discount_type = 'percent',
    updated_at = now()
WHERE discount_type = 'percentage';

UPDATE vouchers
SET code = UPPER(BTRIM(code)),
    updated_at = now()
WHERE code <> UPPER(BTRIM(code));

ALTER TABLE vouchers
  ALTER COLUMN usage_limit DROP DEFAULT;

ALTER TABLE vouchers
  DROP CONSTRAINT IF EXISTS vouchers_discount_type_check,
  DROP CONSTRAINT IF EXISTS vouchers_discount_value_check,
  DROP CONSTRAINT IF EXISTS vouchers_percent_value_check,
  DROP CONSTRAINT IF EXISTS vouchers_min_order_amount_check,
  DROP CONSTRAINT IF EXISTS vouchers_max_discount_amount_check,
  DROP CONSTRAINT IF EXISTS vouchers_usage_limit_check,
  DROP CONSTRAINT IF EXISTS vouchers_used_count_check,
  DROP CONSTRAINT IF EXISTS vouchers_status_check,
  DROP CONSTRAINT IF EXISTS vouchers_date_range_check;

ALTER TABLE vouchers
  ADD CONSTRAINT vouchers_discount_type_check CHECK (discount_type IN ('percent', 'fixed')),
  ADD CONSTRAINT vouchers_discount_value_check CHECK (discount_value > 0),
  ADD CONSTRAINT vouchers_percent_value_check CHECK (discount_type <> 'percent' OR discount_value <= 100),
  ADD CONSTRAINT vouchers_min_order_amount_check CHECK (min_order_amount IS NULL OR min_order_amount >= 0),
  ADD CONSTRAINT vouchers_max_discount_amount_check CHECK (max_discount_amount IS NULL OR max_discount_amount > 0),
  ADD CONSTRAINT vouchers_usage_limit_check CHECK (usage_limit IS NULL OR usage_limit >= 0),
  ADD CONSTRAINT vouchers_used_count_check CHECK (used_count >= 0),
  ADD CONSTRAINT vouchers_status_check CHECK (status IN ('active', 'inactive')),
  ADD CONSTRAINT vouchers_date_range_check CHECK (end_date > start_date);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS voucher_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_discount_amount_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_discount_amount_check CHECK (
    discount_amount >= 0
    AND discount_amount <= subtotal
  );

DROP TABLE IF EXISTS user_vouchers;
