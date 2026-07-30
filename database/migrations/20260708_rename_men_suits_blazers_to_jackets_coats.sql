UPDATE categories category
SET name = 'Jackets & Coats',
    label = 'Jackets & Coats',
    slug = 'men-jackets-coats',
    updated_at = now()
FROM departments department
WHERE category.department_id = department.id
  AND LOWER(department.name) = 'men'
  AND category.deleted_at IS NULL
  AND (
    LOWER(category.slug) = 'men-suits-blazers'
    OR LOWER(category.name) = 'suits & blazers'
    OR LOWER(category.label) = 'suits & blazers'
  );
