CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_code VARCHAR(40) NOT NULL UNIQUE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    return_request_id UUID REFERENCES return_requests(id) ON DELETE RESTRICT,
    refund_type VARCHAR(30) NOT NULL,
    source_key VARCHAR(180) NOT NULL UNIQUE,
    requested_amount NUMERIC(12,2) NOT NULL,
    approved_amount NUMERIC(12,2),
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    reason TEXT NOT NULL,
    admin_note TEXT,
    transaction_reference VARCHAR(160),
    failure_reason TEXT,
    refund_bank_code VARCHAR(30),
    refund_bank_name VARCHAR(120),
    refund_account_number VARCHAR(40),
    refund_account_holder VARCHAR(160),
    refund_account_status VARCHAR(30) NOT NULL DEFAULT 'not_provided',
    refund_account_submitted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    processing_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT refunds_type_check CHECK (refund_type IN ('cancellation', 'product_return', 'admin_adjustment')),
    CONSTRAINT refunds_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    CONSTRAINT refunds_account_status_check CHECK (refund_account_status IN ('not_provided', 'ready')),
    CONSTRAINT refunds_account_fields_check CHECK (
      refund_account_status = 'not_provided'
      OR (
        NULLIF(BTRIM(refund_bank_name), '') IS NOT NULL
        AND NULLIF(BTRIM(refund_account_number), '') IS NOT NULL
        AND NULLIF(BTRIM(refund_account_holder), '') IS NOT NULL
      )
    ),
    CONSTRAINT refunds_amount_check CHECK (requested_amount > 0 AND (approved_amount IS NULL OR approved_amount > 0)),
    CONSTRAINT refunds_return_source_check CHECK ((refund_type = 'product_return' AND return_request_id IS NOT NULL) OR refund_type <> 'product_return')
);

CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refunds_user ON refunds(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_refunds_return_request ON refunds(return_request_id) WHERE return_request_id IS NOT NULL;
