CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    old_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    changed_by UUID,
    changed_by_role VARCHAR(20),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT fk_order_status_history_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    CONSTRAINT order_status_history_old_status_check
        CHECK (old_status IN ('pending', 'confirmed', 'processing', 'shipping', 'delivery_failed', 'delivered', 'completed', 'cancelled') OR old_status IS NULL),

    CONSTRAINT order_status_history_new_status_check
        CHECK (new_status IN ('pending', 'confirmed', 'processing', 'shipping', 'delivery_failed', 'delivered', 'completed', 'cancelled')),

    CONSTRAINT order_status_history_role_check
        CHECK (changed_by_role IN ('admin', 'user', 'system') OR changed_by_role IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order
ON order_status_history(order_id);

CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at
ON order_status_history(created_at);
