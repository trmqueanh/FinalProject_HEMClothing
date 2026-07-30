-- Product style is normalized through products.style_id -> styles.id.
ALTER TABLE products
DROP COLUMN IF EXISTS style;
