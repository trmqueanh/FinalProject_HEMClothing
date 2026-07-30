ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payment_reported_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payment_reviewed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payment_reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS payment_review_reason TEXT,
  ADD COLUMN IF NOT EXISTS payment_received_amount NUMERIC(12, 2);

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check,
  DROP CONSTRAINT IF EXISTS orders_cancelled_by_check,
  DROP CONSTRAINT IF EXISTS orders_payment_received_amount_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN (
    'pending_payment',
    'payment_under_review',
    'paid',
    'payment_failed',
    'payment_expired',
    'amount_mismatch',
    'refund_pending',
    'refunded'
  )),
  ADD CONSTRAINT orders_cancelled_by_check
  CHECK (cancelled_by IN ('user', 'admin', 'system') OR cancelled_by IS NULL),
  ADD CONSTRAINT orders_payment_received_amount_check
  CHECK (payment_received_amount IS NULL OR payment_received_amount >= 0);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_orders_payment_reviewed_by'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT fk_orders_payment_reviewed_by
      FOREIGN KEY (payment_reviewed_by)
      REFERENCES users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE order_status_history
  DROP CONSTRAINT IF EXISTS order_status_history_role_check;

ALTER TABLE order_status_history
  ADD CONSTRAINT order_status_history_role_check
  CHECK (changed_by_role IN ('admin', 'user', 'system') OR changed_by_role IS NULL);

DROP INDEX IF EXISTS idx_orders_bank_transfer_expiry;

CREATE INDEX idx_orders_bank_transfer_expiry
ON orders(payment_expires_at)
WHERE payment_method = 'bank_transfer'
  AND payment_status IN ('pending_payment', 'payment_failed')
  AND order_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_orders_payment_reviewed_by
ON orders(payment_reviewed_by);
