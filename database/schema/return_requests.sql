CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS return_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_code VARCHAR(40) NOT NULL UNIQUE,
    order_id UUID NOT NULL,
    user_id UUID NOT NULL,
    reason VARCHAR(80) NOT NULL,
    note TEXT,
    return_status VARCHAR(30) NOT NULL DEFAULT 'requested',
    restock BOOLEAN,
    admin_note TEXT,
    rejection_reason TEXT,
    approved_by UUID,
    received_by UUID,
    inspected_by UUID,
    refund_bank_code VARCHAR(30),
    refund_bank_name VARCHAR(120),
    refund_account_number VARCHAR(40),
    refund_account_holder VARCHAR(160),
    refund_account_status VARCHAR(30) NOT NULL DEFAULT 'not_provided',
    refund_account_submitted_at TIMESTAMP WITH TIME ZONE,
    refund_account_verified_at TIMESTAMP WITH TIME ZONE,
    refund_account_verified_by UUID,
    refund_account_rejection_reason TEXT,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE,
    inspection_started_at TIMESTAMP WITH TIME ZONE,
    inspected_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT fk_return_requests_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_return_requests_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_return_requests_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_return_requests_received_by FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_return_requests_inspected_by FOREIGN KEY (inspected_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT return_requests_refund_account_verified_by_fkey FOREIGN KEY (refund_account_verified_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT return_requests_reason_check
        CHECK (reason IN ('wrong_size', 'not_as_expected', 'changed_mind', 'defective', 'other')),

    CONSTRAINT return_requests_status_check
        CHECK (return_status IN ('requested', 'approved', 'awaiting_return', 'rejected', 'received', 'inspecting', 'inspection_approved', 'inspection_rejected', 'refund_pending', 'completed')),

    CONSTRAINT return_requests_refund_account_status_check
        CHECK (refund_account_status IN ('not_provided', 'ready')),

    CONSTRAINT return_requests_refund_account_fields_check
        CHECK (
            refund_account_status = 'not_provided'
            OR (
                NULLIF(BTRIM(refund_bank_name), '') IS NOT NULL
                AND NULLIF(BTRIM(refund_account_number), '') IS NOT NULL
                AND NULLIF(BTRIM(refund_account_holder), '') IS NOT NULL
            )
        )
);

CREATE INDEX IF NOT EXISTS idx_return_requests_order
ON return_requests(order_id);

CREATE INDEX IF NOT EXISTS idx_return_requests_user
ON return_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_return_requests_status
ON return_requests(return_status);

CREATE INDEX IF NOT EXISTS idx_return_requests_requested_at
ON return_requests(requested_at);

CREATE INDEX IF NOT EXISTS idx_return_requests_order_created
ON return_requests(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_return_requests_refund_account_status
ON return_requests(refund_account_status, updated_at DESC);
