BEGIN;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_activated_at TIMESTAMP WITH TIME ZONE;

-- Existing QR orders already started their payment window under the previous
-- lifecycle. Mark them active so opening the page cannot reset their deadline.
UPDATE orders
SET payment_activated_at = COALESCE(payment_reported_at, created_at),
    updated_at = now()
WHERE payment_method = 'bank_transfer'
  AND payment_expires_at IS NOT NULL
  AND payment_activated_at IS NULL;

COMMIT;
