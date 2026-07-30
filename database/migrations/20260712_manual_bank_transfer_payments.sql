-- Replace Stripe test payments with manual Bank Transfer (QR Code).

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_check;

UPDATE orders
SET payment_method = CASE
  WHEN payment_method IN ('stripe', 'card') THEN 'bank_transfer'
  ELSE payment_method
END;

ALTER TABLE orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('cod', 'bank_transfer'));

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;

UPDATE orders
SET payment_status = CASE
  WHEN payment_status IN ('pending', 'unpaid') THEN 'pending_payment'
  WHEN payment_status = 'failed' THEN 'payment_failed'
  ELSE payment_status
END;

ALTER TABLE orders
  ALTER COLUMN payment_status SET DEFAULT 'pending_payment';

ALTER TABLE orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending_payment', 'payment_under_review', 'paid', 'payment_failed', 'refund_pending', 'refunded'));

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_refund_method_check;

UPDATE orders
SET refund_method = 'manual'
WHERE refund_method = 'stripe';

ALTER TABLE orders
  ADD CONSTRAINT orders_refund_method_check
  CHECK (refund_method IN ('manual') OR refund_method IS NULL);

DROP INDEX IF EXISTS idx_orders_stripe_refund_id;

ALTER TABLE orders
  DROP COLUMN IF EXISTS payment_intent_id,
  DROP COLUMN IF EXISTS stripe_refund_id;

CREATE INDEX IF NOT EXISTS idx_orders_bank_transfer_review
ON orders(payment_method, payment_status)
WHERE payment_method = 'bank_transfer';

ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_payment_provider_check;

UPDATE user_profiles
SET payment_provider = CASE
  WHEN payment_provider IN ('card', 'stripe') THEN 'bank_transfer'
  ELSE payment_provider
END,
card_holder_name = '',
card_last4 = '',
card_brand = '';

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_payment_provider_check
  CHECK (payment_provider IN ('cod', 'bank_transfer'));

ALTER TABLE user_profiles
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS stripe_payment_method_id;
