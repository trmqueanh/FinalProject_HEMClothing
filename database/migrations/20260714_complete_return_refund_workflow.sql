-- Complete item-level return, system-created refund, and idempotent inventory workflow.

BEGIN;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN (
    'pending_payment',
    'payment_under_review',
    'paid',
    'payment_failed',
    'payment_expired',
    'amount_mismatch',
    'refund_pending',
    'partially_refunded',
    'refunded'
  ));

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS gross_line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS item_discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voucher_discount_allocated NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_quantity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

WITH line_values AS (
  SELECT
    oi.id,
    oi.order_id,
    ROUND(COALESCE(NULLIF(oi.price_at_purchase, 0), oi.product_price, 0) * oi.quantity, 2) AS gross_total,
    ROUND(
      GREATEST(
        COALESCE(oi.original_price_at_purchase, oi.product_price, 0)
          - COALESCE(NULLIF(oi.price_at_purchase, 0), oi.product_price, 0),
        0
      ) * oi.quantity,
      2
    ) AS sale_discount,
    COALESCE(o.discount_amount, 0)::numeric AS order_discount,
    ROW_NUMBER() OVER (PARTITION BY oi.order_id ORDER BY oi.id) AS line_number,
    COUNT(*) OVER (PARTITION BY oi.order_id) AS line_count,
    SUM(COALESCE(NULLIF(oi.price_at_purchase, 0), oi.product_price, 0) * oi.quantity)
      OVER (PARTITION BY oi.order_id) AS order_line_total
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
), provisional AS (
  SELECT
    line_values.*,
    CASE
      WHEN order_discount <= 0 OR order_line_total <= 0 THEN 0::numeric
      WHEN line_number = line_count THEN NULL::numeric
      ELSE FLOOR(order_discount * gross_total * 100 / order_line_total) / 100
    END AS provisional_allocation
  FROM line_values
), allocated AS (
  SELECT
    provisional.*,
    CASE
      WHEN order_discount <= 0 OR order_line_total <= 0 THEN 0::numeric
      WHEN line_number = line_count THEN GREATEST(
        order_discount
          - COALESCE(SUM(provisional_allocation) FILTER (WHERE provisional_allocation IS NOT NULL)
              OVER (PARTITION BY order_id), 0),
        0
      )
      ELSE provisional_allocation
    END AS voucher_allocation
  FROM provisional
)
UPDATE order_items oi
SET gross_line_total = allocated.gross_total,
    item_discount_amount = allocated.sale_discount,
    voucher_discount_allocated = LEAST(allocated.voucher_allocation, allocated.gross_total),
    net_line_total = GREATEST(allocated.gross_total - allocated.voucher_allocation, 0),
    updated_at = now()
FROM allocated
WHERE allocated.id = oi.id;

ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_refunded_quantity_check,
  DROP CONSTRAINT IF EXISTS order_items_refunded_amount_check,
  DROP CONSTRAINT IF EXISTS order_items_refund_allocation_check;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_refunded_quantity_check
    CHECK (refunded_quantity >= 0 AND refunded_quantity <= quantity),
  ADD CONSTRAINT order_items_refunded_amount_check
    CHECK (refunded_amount >= 0 AND refunded_amount <= net_line_total),
  ADD CONSTRAINT order_items_refund_allocation_check
    CHECK (
      gross_line_total >= 0
      AND item_discount_amount >= 0
      AND voucher_discount_allocated >= 0
      AND net_line_total >= 0
      AND net_line_total + voucher_discount_allocated = gross_line_total
    );

ALTER TABLE return_requests
  DROP CONSTRAINT IF EXISTS unique_return_request_order,
  DROP CONSTRAINT IF EXISTS return_requests_status_check;

ALTER TABLE return_requests
  ADD COLUMN IF NOT EXISTS return_code VARCHAR(40),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS received_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS inspected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS inspection_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS inspected_at TIMESTAMP WITH TIME ZONE;

UPDATE return_requests
SET return_code = 'RET-' || UPPER(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 12))
WHERE return_code IS NULL OR BTRIM(return_code) = '';

ALTER TABLE return_requests
  ALTER COLUMN return_code SET NOT NULL;

ALTER TABLE return_requests
  ADD CONSTRAINT return_requests_status_check
  CHECK (return_status IN (
    'requested',
    'approved',
    'awaiting_return',
    'rejected',
    'received',
    'inspecting',
    'inspection_approved',
    'inspection_rejected',
    'refund_pending',
    'completed'
  ));

CREATE UNIQUE INDEX IF NOT EXISTS uq_return_requests_return_code
ON return_requests(return_code);

CREATE INDEX IF NOT EXISTS idx_return_requests_order_created
ON return_requests(order_id, created_at DESC);

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
    approved_quantity >= 0
    AND approved_quantity <= requested_quantity
    AND received_quantity >= 0
    AND received_quantity <= approved_quantity
    AND accepted_quantity >= 0
    AND rejected_quantity >= 0
    AND accepted_quantity + rejected_quantity <= received_quantity
    AND inventory_restored_quantity >= 0
    AND inventory_restored_quantity <= accepted_quantity
  ),
  CONSTRAINT return_items_reason_check CHECK (reason IN ('wrong_size', 'not_as_expected', 'changed_mind', 'defective', 'other')),
  CONSTRAINT return_items_refund_amount_check CHECK (refund_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_return_items_request
ON return_items(return_request_id);

CREATE INDEX IF NOT EXISTS idx_return_items_order_item
ON return_items(order_item_id);

DO $$
BEGIN
  IF to_regclass('public.refund_requests') IS NOT NULL
     AND to_regclass('public.legacy_refund_requests') IS NULL THEN
    ALTER TABLE refund_requests RENAME TO legacy_refund_requests;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_code VARCHAR(40) NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  return_request_id UUID REFERENCES return_requests(id) ON DELETE RESTRICT,
  refund_type VARCHAR(30) NOT NULL,
  source_key VARCHAR(180) NOT NULL,
  requested_amount NUMERIC(12,2) NOT NULL,
  approved_amount NUMERIC(12,2),
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  reason TEXT NOT NULL,
  admin_note TEXT,
  transaction_reference VARCHAR(160),
  failure_reason TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  processing_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT refunds_refund_code_unique UNIQUE (refund_code),
  CONSTRAINT refunds_source_key_unique UNIQUE (source_key),
  CONSTRAINT refunds_type_check CHECK (refund_type IN ('cancellation', 'product_return', 'admin_adjustment')),
  CONSTRAINT refunds_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  CONSTRAINT refunds_amount_check CHECK (requested_amount > 0 AND (approved_amount IS NULL OR approved_amount > 0)),
  CONSTRAINT refunds_return_source_check CHECK (
    (refund_type = 'product_return' AND return_request_id IS NOT NULL)
    OR (refund_type <> 'product_return')
  )
);

CREATE INDEX IF NOT EXISTS idx_refunds_order
ON refunds(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_refunds_user
ON refunds(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_refunds_status
ON refunds(status, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_refunds_return_request
ON refunds(return_request_id)
WHERE return_request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.calculate_product_sold_count(target_product_id uuid)
RETURNS integer AS $$
  SELECT COALESCE(SUM(oi.quantity - COALESCE(oi.refunded_quantity, 0)), 0)::int
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.product_id = target_product_id
    AND o.order_status = 'completed';
$$ LANGUAGE sql STABLE;

DROP TRIGGER IF EXISTS order_items_sync_product_sold_count_after_write ON order_items;

CREATE TRIGGER order_items_sync_product_sold_count_after_write
AFTER INSERT OR DELETE OR UPDATE OF product_id, order_id, quantity, refunded_quantity
ON order_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_sold_count_from_order_item();

UPDATE products p
SET sold_count = public.calculate_product_sold_count(p.id),
    updated_at = now();

COMMIT;
