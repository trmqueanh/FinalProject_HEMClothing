DROP FUNCTION IF EXISTS public.get_landing_collections();

CREATE FUNCTION public.get_landing_collections()
RETURNS TABLE (
    type TEXT,
    id UUID,
    name TEXT,
    slug TEXT,
    banner_image TEXT,
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
        col.banner_image::text,
        COUNT(p.id)::int AS product_count,
        col.created_at
    FROM public.collections col
    LEFT JOIN public.products p ON p.collection_id = col.id
    WHERE col.status = 'active'
      AND col.deleted_at IS NULL
    GROUP BY col.id
    ORDER BY col.created_at DESC NULLS LAST, col.name ASC
    LIMIT 2;
$$;
