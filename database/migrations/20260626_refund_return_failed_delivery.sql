BEGIN;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS refund_method VARCHAR(20),
  ADD COLUMN IF NOT EXISTS returned_to_warehouse_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_refund_method_check;

ALTER TABLE orders
ADD CONSTRAINT orders_refund_method_check
CHECK (refund_method IN ('manual') OR refund_method IS NULL);

ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_refund_amount_check;

ALTER TABLE orders
ADD CONSTRAINT orders_refund_amount_check
CHECK (refund_amount IS NULL OR refund_amount >= 0);

ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_order_status_check;

ALTER TABLE orders
ADD CONSTRAINT orders_order_status_check
CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipping', 'delivery_failed', 'delivered', 'completed', 'cancelled'));

ALTER TABLE order_status_history
DROP CONSTRAINT IF EXISTS order_status_history_old_status_check;

ALTER TABLE order_status_history
DROP CONSTRAINT IF EXISTS order_status_history_new_status_check;

ALTER TABLE order_status_history
ADD CONSTRAINT order_status_history_old_status_check
CHECK (old_status IN ('pending', 'confirmed', 'processing', 'shipping', 'delivery_failed', 'delivered', 'completed', 'cancelled') OR old_status IS NULL);

ALTER TABLE order_status_history
ADD CONSTRAINT order_status_history_new_status_check
CHECK (new_status IN ('pending', 'confirmed', 'processing', 'shipping', 'delivery_failed', 'delivered', 'completed', 'cancelled'));

ALTER TABLE inventory_logs
DROP CONSTRAINT IF EXISTS inventory_logs_type_check;

ALTER TABLE inventory_logs
ADD CONSTRAINT inventory_logs_type_check
CHECK (type IN (
  'import',
  'sold',
  'sale',
  'refund',
  'return',
  'return_restock',
  'return_damaged',
  'delivery_failed_return',
  'adjustment',
  'release_hold',
  'reserve_hold',
  'cancel'
));

CREATE TABLE IF NOT EXISTS return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  user_id UUID NOT NULL,
  reason VARCHAR(80) NOT NULL,
  note TEXT,
  return_status VARCHAR(30) NOT NULL DEFAULT 'requested',
  restock BOOLEAN,
  admin_note TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
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

  CONSTRAINT return_requests_reason_check
    CHECK (reason IN ('wrong_size', 'not_as_expected', 'changed_mind', 'defective', 'other')),

  CONSTRAINT return_requests_status_check
    CHECK (return_status IN ('requested', 'approved', 'rejected', 'received', 'completed')),

  CONSTRAINT unique_return_request_order
    UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_orders_returned_to_warehouse_at
ON orders(returned_to_warehouse_at);

CREATE INDEX IF NOT EXISTS idx_return_requests_order
ON return_requests(order_id);

CREATE INDEX IF NOT EXISTS idx_return_requests_user
ON return_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_return_requests_status
ON return_requests(return_status);

CREATE INDEX IF NOT EXISTS idx_return_requests_requested_at
ON return_requests(requested_at);

COMMIT;
