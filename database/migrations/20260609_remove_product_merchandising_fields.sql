DROP INDEX IF EXISTS public.idx_products_editor_pick;
DROP INDEX IF EXISTS public.idx_products_homepage_priority;

ALTER TABLE public.products
    DROP COLUMN IF EXISTS editor_pick,
    DROP COLUMN IF EXISTS show_homepage,
    DROP COLUMN IF EXISTS display_priority;
