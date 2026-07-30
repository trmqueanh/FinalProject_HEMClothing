BEGIN;

-- Backfill historical order items that were created before variant_id was saved.
WITH matched_variants AS (
  SELECT
    oi.id AS order_item_id,
    pi.id AS variant_id
  FROM order_items oi
  JOIN product_inventory pi
   ON pi.product_id = oi.product_id
   AND COALESCE(pi.size_label, '') = COALESCE(oi.size_label, '')
   AND COALESCE(pi.color_name, '') = COALESCE(oi.color_name, '')
  WHERE oi.variant_id IS NULL
)
UPDATE order_items oi
SET variant_id = matched_variants.variant_id,
    updated_at = now()
FROM matched_variants
WHERE oi.id = matched_variants.order_item_id;

-- Active, not-yet-completed orders should hold inventory.
UPDATE order_items oi
SET reserved_quantity = oi.quantity,
    updated_at = now()
FROM orders o
WHERE o.id = oi.order_id
  AND o.order_status IN ('confirmed', 'processing', 'shipping', 'delivered')
  AND oi.variant_id IS NOT NULL;

-- Completed/cancelled orders should not keep item-level holds.
UPDATE order_items oi
SET reserved_quantity = 0,
    updated_at = now()
FROM orders o
WHERE o.id = oi.order_id
  AND o.order_status IN ('completed', 'cancelled')
  AND oi.variant_id IS NOT NULL;

-- Sync variant reserved counters from active orders.
WITH active_reservations AS (
  SELECT
    oi.variant_id,
    SUM(oi.quantity)::int AS reserved_quantity
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.order_status IN ('confirmed', 'processing', 'shipping', 'delivered')
    AND oi.variant_id IS NOT NULL
  GROUP BY oi.variant_id
)
UPDATE product_inventory pi
SET stock_quantity = GREATEST(pi.stock_quantity, active_reservations.reserved_quantity),
    reserved_quantity = active_reservations.reserved_quantity,
    updated_at = now()
FROM active_reservations
WHERE pi.id = active_reservations.variant_id;

UPDATE product_inventory pi
SET reserved_quantity = 0,
    updated_at = now()
WHERE NOT EXISTS (
  SELECT 1
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.order_status IN ('confirmed', 'processing', 'shipping', 'delivered')
    AND oi.variant_id = pi.id
);

-- Sync sold counters from completed orders.
WITH completed_sales AS (
  SELECT
    oi.variant_id,
    SUM(oi.quantity)::int AS sold_quantity
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.order_status = 'completed'
    AND oi.variant_id IS NOT NULL
  GROUP BY oi.variant_id
)
UPDATE product_inventory pi
SET sold_quantity = completed_sales.sold_quantity,
    updated_at = now()
FROM completed_sales
WHERE pi.id = completed_sales.variant_id;

UPDATE product_inventory pi
SET sold_quantity = 0,
    updated_at = now()
WHERE NOT EXISTS (
  SELECT 1
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.order_status = 'completed'
    AND oi.variant_id = pi.id
);

-- Products keep aggregate counters for fast admin/product listing.
UPDATE products p
SET inventory = summary.stock_quantity,
    reserved_inventory = summary.reserved_quantity,
    sold_quantity = summary.sold_quantity,
    sold_count = summary.ordered_quantity,
    updated_at = now()
FROM (
  SELECT
    pi.product_id,
    COALESCE(SUM(pi.stock_quantity), 0)::int AS stock_quantity,
    COALESCE(SUM(pi.reserved_quantity), 0)::int AS reserved_quantity,
    COALESCE(SUM(pi.sold_quantity), 0)::int AS sold_quantity,
    COALESCE(order_totals.ordered_quantity, 0)::int AS ordered_quantity
  FROM product_inventory pi
  LEFT JOIN (
    SELECT
      oi.product_id,
      SUM(oi.quantity)::int AS ordered_quantity
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.order_status <> 'cancelled'
    GROUP BY oi.product_id
  ) order_totals ON order_totals.product_id = pi.product_id
  GROUP BY pi.product_id, order_totals.ordered_quantity
) summary
WHERE p.id = summary.product_id;

COMMIT;
