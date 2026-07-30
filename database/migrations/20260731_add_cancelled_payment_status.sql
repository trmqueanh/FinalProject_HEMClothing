ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;

UPDATE orders
SET payment_status = 'payment_cancelled',
    updated_at = now()
WHERE order_status = 'cancelled'
  AND payment_status = 'pending_payment';

ALTER TABLE orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN (
    'pending_payment',
    'payment_under_review',
    'paid',
    'payment_expired',
    'payment_cancelled',
    'refund_pending',
    'partially_refunded',
    'refunded'
  ));
