UPDATE products p
SET status = 'inactive',
    deleted_at = NULL,
    updated_at = now()
WHERE p.deleted_at IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM order_items oi
    WHERE oi.product_id = p.id
  );

ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS fk_order_items_product,
  DROP CONSTRAINT IF EXISTS order_items_product_id_fkey,
  DROP CONSTRAINT IF EXISTS fk_order_items_variant,
  DROP CONSTRAINT IF EXISTS order_items_variant_id_fkey;

ALTER TABLE order_items
  ADD CONSTRAINT fk_order_items_product
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT fk_order_items_variant
    FOREIGN KEY (variant_id)
    REFERENCES product_inventory(id)
    ON DELETE RESTRICT;
