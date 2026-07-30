UPDATE categories category
SET status = 'inactive',
    deleted_at = COALESCE(category.deleted_at, now()),
    updated_at = now()
FROM departments department
WHERE category.department_id = department.id
  AND LOWER(department.name) = 'women'
  AND category.deleted_at IS NULL
  AND (
    LOWER(category.slug) IN ('women-shirts-blouses', 'women-sleepwear')
    OR LOWER(category.name) IN ('shirts & blouses', 'sleepwear')
    OR LOWER(category.label) IN ('shirts & blouses', 'sleepwear')
  );
