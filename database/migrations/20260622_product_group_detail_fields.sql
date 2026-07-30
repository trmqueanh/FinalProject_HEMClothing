ALTER TABLE products
ADD COLUMN IF NOT EXISTS fit_id UUID,
ADD COLUMN IF NOT EXISTS heel_height VARCHAR(20);

DO $$
BEGIN
  ALTER TABLE products
    ADD CONSTRAINT products_fit_id_fkey
    FOREIGN KEY (fit_id) REFERENCES fits(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE products
DROP CONSTRAINT IF EXISTS products_heel_height_check;

ALTER TABLE products
ADD CONSTRAINT products_heel_height_check
CHECK (heel_height IS NULL OR heel_height IN ('High heel', 'Mid heel', 'Low heel', 'No heel'));

UPDATE products product
SET fit_id = (
  SELECT fit.id
  FROM fits fit
  WHERE fit.product_group_id = product_group.id
    AND (fit.department_id IS NULL OR fit.department_id = product.department_id)
    AND (
      LOWER(fit.name) = LOWER(product.fit)
      OR LOWER(fit.name) = LOWER(BTRIM(product.fit) || ' fit')
    )
    AND COALESCE(fit.status, 'active') = 'active'
    AND fit.deleted_at IS NULL
  ORDER BY (fit.department_id = product.department_id) DESC, fit.sort_order, fit.id
  LIMIT 1
)
FROM product_groups product_group
WHERE product.product_group_id = product_group.id
  AND product_group.slug = 'clothing'
  AND product.fit_id IS NULL
  AND NULLIF(BTRIM(product.fit), '') IS NOT NULL;

UPDATE products product
SET fit = fit.name
FROM fits fit,
     product_groups product_group
WHERE product.fit_id = fit.id
  AND product.product_group_id = product_group.id
  AND product_group.slug = 'clothing'
  AND product.fit IS DISTINCT FROM fit.name;

UPDATE products product
SET fit = NULL,
    fit_id = NULL
FROM product_groups product_group
WHERE product.product_group_id = product_group.id
  AND product_group.slug <> 'clothing'
  AND (product.fit IS NOT NULL OR product.fit_id IS NOT NULL);

UPDATE products product
SET heel_height = NULL
FROM product_groups product_group
WHERE product.product_group_id = product_group.id
  AND product_group.slug <> 'shoes'
  AND product.heel_height IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_fit_id ON products(fit_id);
