WITH shoe_guides AS (
    SELECT *
    FROM (
        VALUES
        (
            'men',
            jsonb_build_object(
                'columns', jsonb_build_array('EU', 'UK', 'US', 'Foot length (cm)'),
                'rows', jsonb_build_array(
                    jsonb_build_array('39', '5.5', '6.5', '24.6'),
                    jsonb_build_array('40', '6.5', '7.5', '25.4'),
                    jsonb_build_array('41', '7', '8', '26.2'),
                    jsonb_build_array('42', '8', '9', '27.1'),
                    jsonb_build_array('43', '9', '10', '27.9'),
                    jsonb_build_array('44', '9.5', '10.5', '28.4'),
                    jsonb_build_array('45', '10.5', '11.5', '29.2'),
                    jsonb_build_array('46', '11', '12', '29.6')
                )
            )
        ),
        (
            'women',
            jsonb_build_object(
                'columns', jsonb_build_array('EU', 'UK', 'US', 'Foot length (cm)'),
                'rows', jsonb_build_array(
                    jsonb_build_array('35', '2.5', '5', '22.0'),
                    jsonb_build_array('36', '3.5', '6', '22.9'),
                    jsonb_build_array('37', '4', '6.5', '23.7'),
                    jsonb_build_array('38', '5', '7.5', '24.6'),
                    jsonb_build_array('39', '6', '8.5', '25.4'),
                    jsonb_build_array('40', '6.5', '9', '25.8'),
                    jsonb_build_array('41', '7.5', '10', '26.7'),
                    jsonb_build_array('42', '8', '10.5', '27.1')
                )
            )
        )
    ) AS guide(department_name, guide_data)
),
shoe_categories AS (
    SELECT
        category.id AS category_id,
        CONCAT(
            INITCAP(COALESCE(NULLIF(department.label, ''), department.name, 'Shoes')),
            ' ',
            COALESCE(NULLIF(category.label, ''), category.name),
            ' Size Guide'
        ) AS title,
        shoe_guides.guide_data
    FROM categories category
    JOIN product_groups product_group
        ON product_group.id = category.product_group_id
    JOIN departments department
        ON department.id = category.department_id
    JOIN shoe_guides
        ON shoe_guides.department_name = LOWER(COALESCE(department.name, ''))
    WHERE LOWER(COALESCE(product_group.slug, product_group.name, '')) = 'shoes'
      AND category.deleted_at IS NULL
      AND COALESCE(category.status, 'active') = 'active'
),
updated AS (
    UPDATE size_guides guide
    SET
        title = shoe_categories.title,
        unit = 'cm',
        guide_data = shoe_categories.guide_data,
        updated_at = now()
    FROM shoe_categories
    WHERE guide.category_id = shoe_categories.category_id
    RETURNING guide.category_id
)
INSERT INTO size_guides (
    category_id,
    title,
    unit,
    guide_data,
    created_at,
    updated_at
)
SELECT
    shoe_categories.category_id,
    shoe_categories.title,
    'cm',
    shoe_categories.guide_data,
    now(),
    now()
FROM shoe_categories
WHERE NOT EXISTS (
    SELECT 1
    FROM updated
    WHERE updated.category_id = shoe_categories.category_id
);
