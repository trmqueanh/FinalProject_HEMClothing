UPDATE categories category
SET status = 'inactive',
    deleted_at = COALESCE(category.deleted_at, now()),
    updated_at = now()
FROM departments department,
     product_groups product_group
WHERE category.department_id = department.id
  AND category.product_group_id = product_group.id
  AND LOWER(department.name) = 'women'
  AND LOWER(product_group.slug) = 'shoes'
  AND category.deleted_at IS NULL
  AND (
    LOWER(category.slug) IN (
      'women-espadrilles',
      'women-mary-janes',
      'women-premium-shoes',
      'women-sneakers'
    )
    OR LOWER(category.name) IN (
      'espadrilles',
      'mary janes',
      'premium shoes',
      'sneakers'
    )
    OR LOWER(category.label) IN (
      'espadrilles',
      'mary janes',
      'premium shoes',
      'sneakers'
    )
  );
