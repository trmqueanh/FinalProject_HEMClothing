BEGIN;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;

UPDATE orders
SET payment_status = 'payment_rejected',
    updated_at = now()
WHERE payment_method = 'bank_transfer'
  AND order_status = 'cancelled'
  AND payment_status = 'payment_expired'
  AND payment_reviewed_by IS NOT NULL
  AND NULLIF(TRIM(COALESCE(payment_review_reason, '')), '') IS NOT NULL;

ALTER TABLE orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN (
    'pending_payment',
    'payment_under_review',
    'paid',
    'payment_expired',
    'payment_cancelled',
    'payment_rejected',
    'refund_pending',
    'partially_refunded',
    'refunded'
  ));

COMMIT;
