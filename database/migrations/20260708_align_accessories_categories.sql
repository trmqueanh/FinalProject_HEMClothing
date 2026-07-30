WITH men_accessories AS (
    SELECT department.id AS department_id,
           product_group.id AS product_group_id
    FROM departments department
    JOIN product_groups product_group ON LOWER(product_group.slug) = 'accessories'
    WHERE LOWER(department.name) = 'men'
)
UPDATE categories category
SET status = 'inactive',
    deleted_at = COALESCE(category.deleted_at, now()),
    updated_at = now()
FROM men_accessories
WHERE category.department_id = men_accessories.department_id
  AND category.product_group_id = men_accessories.product_group_id
  AND category.deleted_at IS NULL
  AND (
    LOWER(category.slug) IN ('men-tech-accessories', 'tech-accessories', 'men-gloves', 'gloves')
    OR LOWER(category.name) IN ('tech accessories', 'gloves')
    OR LOWER(category.label) IN ('tech accessories', 'gloves')
  );

WITH women_accessories AS (
    SELECT department.id AS department_id,
           product_group.id AS product_group_id
    FROM departments department
    JOIN product_groups product_group ON LOWER(product_group.slug) = 'accessories'
    WHERE LOWER(department.name) = 'women'
)
INSERT INTO categories (name, label, slug, department_id, product_group_id, status, created_at, updated_at, deleted_at)
SELECT 'Jewelry',
       'Jewelry',
       'women-jewelry',
       women_accessories.department_id,
       women_accessories.product_group_id,
       'active',
       now(),
       now(),
       NULL
FROM women_accessories
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    label = EXCLUDED.label,
    department_id = EXCLUDED.department_id,
    product_group_id = EXCLUDED.product_group_id,
    status = 'active',
    deleted_at = NULL,
    updated_at = now();
