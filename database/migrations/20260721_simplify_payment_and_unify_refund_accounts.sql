BEGIN;

UPDATE orders
SET payment_status = CASE
  WHEN payment_status = 'amount_mismatch' THEN 'payment_under_review'
  WHEN payment_status = 'payment_failed' AND order_status = 'cancelled' THEN 'payment_expired'
  WHEN payment_status = 'payment_failed' THEN 'pending_payment'
  ELSE payment_status
END,
updated_at = now()
WHERE payment_status IN ('amount_mismatch', 'payment_failed');

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check CHECK (payment_status IN (
  'pending_payment', 'payment_under_review', 'paid', 'payment_expired',
  'refund_pending', 'partially_refunded', 'refunded'
));

ALTER TABLE return_requests
  DROP CONSTRAINT IF EXISTS return_requests_refund_account_status_check,
  DROP CONSTRAINT IF EXISTS return_requests_refund_account_fields_check;

UPDATE return_requests
SET refund_account_status = CASE
      WHEN NULLIF(BTRIM(refund_account_number), '') IS NULL THEN 'not_provided'
      ELSE 'ready'
    END,
    updated_at = now()
WHERE refund_account_status <> CASE
  WHEN NULLIF(BTRIM(refund_account_number), '') IS NULL THEN 'not_provided'
  ELSE 'ready'
END;

ALTER TABLE return_requests
  ADD CONSTRAINT return_requests_refund_account_status_check
    CHECK (refund_account_status IN ('not_provided', 'ready')),
  ADD CONSTRAINT return_requests_refund_account_fields_check CHECK (
    refund_account_status = 'not_provided'
    OR (
      NULLIF(BTRIM(refund_bank_name), '') IS NOT NULL
      AND NULLIF(BTRIM(refund_account_number), '') IS NOT NULL
      AND NULLIF(BTRIM(refund_account_holder), '') IS NOT NULL
    )
  );

ALTER TABLE refunds
  ADD COLUMN IF NOT EXISTS refund_bank_code VARCHAR(30),
  ADD COLUMN IF NOT EXISTS refund_bank_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS refund_account_number VARCHAR(40),
  ADD COLUMN IF NOT EXISTS refund_account_holder VARCHAR(160),
  ADD COLUMN IF NOT EXISTS refund_account_status VARCHAR(30) NOT NULL DEFAULT 'not_provided',
  ADD COLUMN IF NOT EXISTS refund_account_submitted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE refunds
  DROP CONSTRAINT IF EXISTS refunds_account_status_check,
  DROP CONSTRAINT IF EXISTS refunds_account_fields_check;

UPDATE refunds r
SET refund_bank_code = rr.refund_bank_code,
    refund_bank_name = rr.refund_bank_name,
    refund_account_number = rr.refund_account_number,
    refund_account_holder = rr.refund_account_holder,
    refund_account_status = CASE
      WHEN NULLIF(BTRIM(rr.refund_account_number), '') IS NULL THEN 'not_provided'
      ELSE 'ready'
    END,
    refund_account_submitted_at = rr.refund_account_submitted_at,
    updated_at = now()
FROM return_requests rr
WHERE r.return_request_id = rr.id
  AND r.refund_account_status = 'not_provided';

ALTER TABLE refunds
  ADD CONSTRAINT refunds_account_status_check
    CHECK (refund_account_status IN ('not_provided', 'ready')),
  ADD CONSTRAINT refunds_account_fields_check CHECK (
    refund_account_status = 'not_provided'
    OR (
      NULLIF(BTRIM(refund_bank_name), '') IS NOT NULL
      AND NULLIF(BTRIM(refund_account_number), '') IS NOT NULL
      AND NULLIF(BTRIM(refund_account_holder), '') IS NOT NULL
    )
  );

CREATE INDEX IF NOT EXISTS idx_refunds_account_status
ON refunds(refund_account_status, updated_at DESC);

COMMIT;
