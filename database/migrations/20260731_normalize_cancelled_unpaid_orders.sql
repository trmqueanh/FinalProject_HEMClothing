UPDATE orders
SET payment_status = 'payment_cancelled',
    updated_at = now()
WHERE order_status = 'cancelled'
  AND payment_status = 'pending_payment';
