CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_request_id UUID NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
    requested_quantity INTEGER NOT NULL,
    approved_quantity INTEGER NOT NULL DEFAULT 0,
    received_quantity INTEGER NOT NULL DEFAULT 0,
    accepted_quantity INTEGER NOT NULL DEFAULT 0,
    rejected_quantity INTEGER NOT NULL DEFAULT 0,
    reason VARCHAR(80) NOT NULL,
    customer_note TEXT,
    evidence_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    condition_code VARCHAR(60),
    inspection_note TEXT,
    rejection_reason TEXT,
    restockable BOOLEAN,
    refund_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    inventory_restored_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT return_items_unique_order_item UNIQUE (return_request_id, order_item_id),
    CONSTRAINT return_items_requested_quantity_check CHECK (requested_quantity > 0),
    CONSTRAINT return_items_quantity_progress_check CHECK (
      approved_quantity >= 0 AND approved_quantity <= requested_quantity
      AND received_quantity >= 0 AND received_quantity <= approved_quantity
      AND accepted_quantity >= 0 AND rejected_quantity >= 0
      AND accepted_quantity + rejected_quantity <= received_quantity
      AND inventory_restored_quantity >= 0 AND inventory_restored_quantity <= accepted_quantity
    ),
    CONSTRAINT return_items_reason_check CHECK (reason IN ('wrong_size', 'not_as_expected', 'changed_mind', 'defective', 'other')),
    CONSTRAINT return_items_refund_amount_check CHECK (refund_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_return_items_request ON return_items(return_request_id);
CREATE INDEX IF NOT EXISTS idx_return_items_order_item ON return_items(order_item_id);
