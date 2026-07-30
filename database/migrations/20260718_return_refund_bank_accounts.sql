-- Add customer-provided bank accounts and admin verification to product-return refunds.

BEGIN;

ALTER TABLE return_requests
  ADD COLUMN IF NOT EXISTS refund_bank_code VARCHAR(30),
  ADD COLUMN IF NOT EXISTS refund_bank_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS refund_account_number VARCHAR(40),
  ADD COLUMN IF NOT EXISTS refund_account_holder VARCHAR(160),
  ADD COLUMN IF NOT EXISTS refund_account_status VARCHAR(30) NOT NULL DEFAULT 'not_provided',
  ADD COLUMN IF NOT EXISTS refund_account_submitted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS refund_account_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS refund_account_verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS refund_account_rejection_reason TEXT;

ALTER TABLE return_requests
  DROP CONSTRAINT IF EXISTS return_requests_refund_account_status_check,
  DROP CONSTRAINT IF EXISTS return_requests_refund_account_fields_check;

ALTER TABLE return_requests
  ADD CONSTRAINT return_requests_refund_account_status_check
    CHECK (refund_account_status IN ('not_provided', 'pending_verification', 'verified', 'rejected')),
  ADD CONSTRAINT return_requests_refund_account_fields_check
    CHECK (
      refund_account_status = 'not_provided'
      OR (
        NULLIF(BTRIM(refund_bank_name), '') IS NOT NULL
        AND NULLIF(BTRIM(refund_account_number), '') IS NOT NULL
        AND NULLIF(BTRIM(refund_account_holder), '') IS NOT NULL
      )
    );

CREATE INDEX IF NOT EXISTS idx_return_requests_refund_account_status
ON return_requests(refund_account_status, updated_at DESC);

COMMIT;
