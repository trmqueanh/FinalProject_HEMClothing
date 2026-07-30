WITH target AS (
    SELECT department.id AS department_id,
           product_group.id AS product_group_id
    FROM departments department
    JOIN product_groups product_group ON LOWER(product_group.slug) = 'shoes'
    WHERE LOWER(department.name) = 'men'
),
allowed(name, label, slug) AS (
    VALUES
        ('Sneakers', 'Sneakers', 'men-sneakers'),
        ('Dress Shoes', 'Dress Shoes', 'men-dress-shoes'),
        ('Loafers', 'Loafers', 'men-loafers'),
        ('Sandals', 'Sandals', 'men-sandals'),
        ('Mules', 'Mules', 'men-mules')
)
UPDATE categories category
SET status = 'inactive',
    deleted_at = COALESCE(category.deleted_at, now()),
    updated_at = now()
FROM target
WHERE category.department_id = target.department_id
  AND category.product_group_id = target.product_group_id
  AND category.deleted_at IS NULL
  AND LOWER(category.slug) NOT IN (SELECT slug FROM allowed);

WITH target AS (
    SELECT department.id AS department_id,
           product_group.id AS product_group_id
    FROM departments department
    JOIN product_groups product_group ON LOWER(product_group.slug) = 'shoes'
    WHERE LOWER(department.name) = 'men'
),
allowed(name, label, slug) AS (
    VALUES
        ('Sneakers', 'Sneakers', 'men-sneakers'),
        ('Dress Shoes', 'Dress Shoes', 'men-dress-shoes'),
        ('Loafers', 'Loafers', 'men-loafers'),
        ('Sandals', 'Sandals', 'men-sandals'),
        ('Mules', 'Mules', 'men-mules')
)
INSERT INTO categories (name, label, slug, department_id, product_group_id, status, created_at, updated_at, deleted_at)
SELECT allowed.name,
       allowed.label,
       allowed.slug,
       target.department_id,
       target.product_group_id,
       'active',
       now(),
       now(),
       NULL
FROM allowed
CROSS JOIN target
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    label = EXCLUDED.label,
    department_id = EXCLUDED.department_id,
    product_group_id = EXCLUDED.product_group_id,
    status = 'active',
    deleted_at = NULL,
    updated_at = now();
