BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.user_favorites
    ADD COLUMN IF NOT EXISTS id UUID;

UPDATE public.user_favorites
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE public.user_favorites
    ALTER COLUMN id SET DEFAULT gen_random_uuid(),
    ALTER COLUMN id SET NOT NULL;

WITH default_colors AS (
    SELECT DISTINCT ON (product_id)
        product_id,
        id AS color_variant_id
    FROM public.product_color_variants
    WHERE deleted_at IS NULL
    ORDER BY product_id, sort_order ASC, created_at ASC, id ASC
)
DELETE FROM public.user_favorites legacy
USING default_colors defaults, public.user_favorites existing
WHERE legacy.color_variant_id IS NULL
  AND defaults.product_id = legacy.product_id
  AND existing.user_id = legacy.user_id
  AND existing.product_id = legacy.product_id
  AND existing.color_variant_id = defaults.color_variant_id
  AND existing.ctid <> legacy.ctid;

WITH default_colors AS (
    SELECT DISTINCT ON (product_id)
        product_id,
        id AS color_variant_id
    FROM public.product_color_variants
    WHERE deleted_at IS NULL
    ORDER BY product_id, sort_order ASC, created_at ASC, id ASC
)
UPDATE public.user_favorites favorites
SET color_variant_id = defaults.color_variant_id
FROM default_colors defaults
WHERE favorites.color_variant_id IS NULL
  AND favorites.product_id = defaults.product_id;

DELETE FROM public.user_favorites
WHERE color_variant_id IS NULL;

DO $$
DECLARE
    primary_key_name TEXT;
BEGIN
    SELECT conname
    INTO primary_key_name
    FROM pg_constraint
    WHERE conrelid = 'public.user_favorites'::regclass
      AND contype = 'p';

    IF primary_key_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.user_favorites DROP CONSTRAINT %I', primary_key_name);
    END IF;
END $$;

ALTER TABLE public.user_favorites
    DROP CONSTRAINT IF EXISTS unique_user_favorite,
    DROP CONSTRAINT IF EXISTS fk_favorites_color_variant;

DROP INDEX IF EXISTS public.idx_user_favorites_unique_product;
DROP INDEX IF EXISTS public.idx_user_favorites_unique_product_variant;

DELETE FROM public.user_favorites duplicate
USING public.user_favorites retained
WHERE duplicate.id > retained.id
  AND duplicate.user_id = retained.user_id
  AND duplicate.product_id = retained.product_id
  AND duplicate.color_variant_id = retained.color_variant_id;

ALTER TABLE public.user_favorites
    ALTER COLUMN color_variant_id SET NOT NULL,
    ADD CONSTRAINT user_favorites_pkey PRIMARY KEY (id),
    ADD CONSTRAINT fk_favorites_color_variant
        FOREIGN KEY (color_variant_id)
        REFERENCES public.product_color_variants(id)
        ON DELETE CASCADE;

CREATE UNIQUE INDEX idx_user_favorites_unique_product_variant
    ON public.user_favorites(user_id, product_id, color_variant_id);

COMMIT;
