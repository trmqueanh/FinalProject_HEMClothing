UPDATE categories category
SET status = 'inactive',
    deleted_at = COALESCE(category.deleted_at, now()),
    updated_at = now()
FROM departments department,
     product_groups product_group
WHERE category.department_id = department.id
  AND category.product_group_id = product_group.id
  AND LOWER(department.name) = 'men'
  AND LOWER(product_group.slug) = 'clothing'
  AND category.deleted_at IS NULL
  AND (
    LOWER(category.slug) IN (
      'men-sleepwear',
      'sleepwear',
      'men-sweatpants',
      'sweatpants',
      'men-sweatpant',
      'sweatpant',
      'men-sweat-pants',
      'sweat-pants',
      'men-sweetpants',
      'sweetpants',
      'men-sweetpant',
      'sweetpant'
    )
    OR LOWER(category.name) IN (
      'sleepwear',
      'sweatpants',
      'sweatpant',
      'sweat pants',
      'sweetpants',
      'sweetpant'
    )
    OR LOWER(category.label) IN (
      'sleepwear',
      'sweatpants',
      'sweatpant',
      'sweat pants',
      'sweetpants',
      'sweetpant'
    )
  );
