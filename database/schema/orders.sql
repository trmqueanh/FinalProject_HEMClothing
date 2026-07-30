CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    voucher_code VARCHAR(100),
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(20) NOT NULL,
    payment_status VARCHAR(30) NOT NULL DEFAULT 'pending_payment',
    order_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    shipping_full_name VARCHAR(120) NOT NULL,
    shipping_phone VARCHAR(30) NOT NULL,
    shipping_city VARCHAR(100) NOT NULL DEFAULT '',
    shipping_district VARCHAR(100) NOT NULL DEFAULT '',
    shipping_ward VARCHAR(100) NOT NULL DEFAULT '',
    shipping_address_line TEXT NOT NULL DEFAULT '',
    shipping_note TEXT,
    cancel_reason TEXT,
    cancelled_by VARCHAR(20),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    refund_amount NUMERIC(10,2),
    refund_method VARCHAR(20),
    returned_to_warehouse_at TIMESTAMP WITH TIME ZONE,
    payment_activated_at TIMESTAMP WITH TIME ZONE,
    payment_expires_at TIMESTAMP WITH TIME ZONE,
    payment_reported_at TIMESTAMP WITH TIME ZONE,
    payment_reviewed_at TIMESTAMP WITH TIME ZONE,
    payment_reviewed_by UUID,
    payment_review_reason TEXT,
    payment_received_amount NUMERIC(12,2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_orders_payment_reviewed_by
        FOREIGN KEY (payment_reviewed_by)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('cod', 'bank_transfer')),
    CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('pending_payment', 'payment_under_review', 'paid', 'payment_expired', 'payment_cancelled', 'refund_pending', 'partially_refunded', 'refunded')),
    CONSTRAINT orders_order_status_check CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipping', 'delivery_failed', 'delivered', 'completed', 'cancelled')),
    CONSTRAINT orders_cancelled_by_check CHECK (cancelled_by IN ('user', 'admin', 'system') OR cancelled_by IS NULL),
    CONSTRAINT orders_refund_method_check CHECK (refund_method IN ('manual') OR refund_method IS NULL),
    CONSTRAINT orders_subtotal_check CHECK (subtotal >= 0),
    CONSTRAINT orders_shipping_fee_check CHECK (shipping_fee >= 0),
    CONSTRAINT orders_discount_amount_check CHECK (discount_amount >= 0 AND discount_amount <= subtotal),
    CONSTRAINT orders_total_amount_check CHECK (total_amount >= 0),
    CONSTRAINT orders_refund_amount_check CHECK (refund_amount IS NULL OR refund_amount >= 0),
    CONSTRAINT orders_payment_received_amount_check CHECK (payment_received_amount IS NULL OR payment_received_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id
ON orders(user_id);

CREATE INDEX IF NOT EXISTS idx_orders_status
ON orders(order_status);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status
ON orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
ON orders(created_at);

CREATE INDEX IF NOT EXISTS idx_orders_payment_method
ON orders(payment_method);

CREATE INDEX IF NOT EXISTS idx_orders_cancelled_at
ON orders(cancelled_at);

CREATE INDEX IF NOT EXISTS idx_orders_completed_at
ON orders(completed_at);

CREATE INDEX IF NOT EXISTS idx_orders_delivered_at
ON orders(delivered_at);

CREATE INDEX IF NOT EXISTS idx_orders_refunded_at
ON orders(refunded_at);

CREATE INDEX IF NOT EXISTS idx_orders_returned_to_warehouse_at
ON orders(returned_to_warehouse_at);

CREATE INDEX IF NOT EXISTS idx_orders_bank_transfer_review
ON orders(payment_method, payment_status)
WHERE payment_method = 'bank_transfer';

CREATE INDEX IF NOT EXISTS idx_orders_bank_transfer_expiry
ON orders(payment_expires_at)
WHERE payment_method = 'bank_transfer'
  AND payment_status = 'pending_payment'
  AND order_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_orders_payment_reviewed_by
ON orders(payment_reviewed_by);
