WITH product_options AS (
    SELECT
        p.id AS product_id,
        upper(regexp_replace(COALESCE(p.slug, p.name), '[^A-Za-z0-9]+', '-', 'g')) AS product_base_code,
        CASE
            WHEN c.slug ILIKE '%jeans%' OR c.slug ILIKE '%pants%' THEN ARRAY['28', '30', '32']
            ELSE ARRAY['S', 'M', 'L']
        END AS sizes,
        CASE
            WHEN c.slug ILIKE '%jeans%' THEN ARRAY['Blue', 'Black']
            ELSE ARRAY['Black', 'White', 'Grey']
        END AS colors
    FROM products p
    JOIN categories c ON c.id = p.category_id
),
expanded_inventory AS (
    SELECT
        product_id,
        color_name,
        size_label,
        (floor(random() * 13))::int AS stock_quantity,
        upper(product_base_code || '-' || regexp_replace(color_name, '[^A-Za-z0-9]+', '-', 'g')) AS product_code
    FROM product_options
    CROSS JOIN LATERAL unnest(colors) AS color_name
    CROSS JOIN LATERAL unnest(sizes) AS size_label
)
INSERT INTO product_inventory (product_id, color_name, size_label, stock_quantity, product_code, article_number)
SELECT product_id, color_name, size_label, stock_quantity, product_code, product_code
FROM expanded_inventory
ON CONFLICT ON CONSTRAINT unique_product_color_size DO UPDATE
SET
    product_code = EXCLUDED.product_code,
    article_number = EXCLUDED.article_number,
    stock_quantity = EXCLUDED.stock_quantity;
