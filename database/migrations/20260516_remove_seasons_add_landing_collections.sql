ALTER TABLE IF EXISTS products
DROP CONSTRAINT IF EXISTS fk_products_season;

DROP INDEX IF EXISTS idx_products_season_id;

ALTER TABLE IF EXISTS products
DROP COLUMN IF EXISTS season_id,
DROP COLUMN IF EXISTS inventory,
DROP COLUMN IF EXISTS spotlight,
DROP COLUMN IF EXISTS palette_base,
DROP COLUMN IF EXISTS palette_accent,
DROP COLUMN IF EXISTS palette_glow;

ALTER TABLE IF EXISTS products
ADD COLUMN IF NOT EXISTS sold_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS products
DROP CONSTRAINT IF EXISTS products_sold_count_check,
ADD CONSTRAINT products_sold_count_check CHECK (sold_count >= 0);

CREATE INDEX IF NOT EXISTS idx_products_sold_count
ON products(sold_count);

CREATE INDEX IF NOT EXISTS idx_products_new_arrival
ON products(new_arrival);

DROP FUNCTION IF EXISTS get_landing_spotlights();

DROP TABLE IF EXISTS seasons;

CREATE OR REPLACE FUNCTION get_landing_collections()
RETURNS TABLE (
    type TEXT,
    id UUID,
    name TEXT,
    slug TEXT,
    featured BOOLEAN,
    product_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        'collection'::text AS type,
        col.id,
        col.name::text,
        col.slug::text,
        COALESCE(col.featured, false) AS featured,
        COUNT(p.id)::int AS product_count,
        col.created_at
    FROM collections col
    LEFT JOIN products p ON p.collection_id = col.id
    GROUP BY col.id
    ORDER BY col.created_at DESC NULLS LAST, col.name ASC
    LIMIT 2;
$$;
