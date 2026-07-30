BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_unique_variant
ON public.cart_items (
  cart_id,
  product_id,
  (COALESCE(size_label, '')),
  color_variant_id
)
WHERE color_variant_id IS NOT NULL;

COMMIT;
