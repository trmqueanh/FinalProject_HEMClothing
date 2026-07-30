BEGIN;

CREATE TABLE IF NOT EXISTS public.collection_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    banner_image_url TEXT NOT NULL,
    banner_public_id TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT collection_departments_status_check CHECK (status IN ('active', 'inactive')),
    CONSTRAINT collection_departments_unique UNIQUE (collection_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_departments_collection
ON public.collection_departments(collection_id);

CREATE INDEX IF NOT EXISTS idx_collection_departments_department
ON public.collection_departments(department_id, status)
WHERE deleted_at IS NULL;

-- Preserve current storefront availability by creating one department mapping
-- for every department that already has products in the collection.
INSERT INTO public.collection_departments (
    collection_id,
    department_id,
    banner_image_url,
    status,
    created_at,
    updated_at
)
SELECT DISTINCT
    col.id,
    p.department_id,
    COALESCE(NULLIF(col.banner_image, ''), ''),
    'active',
    now(),
    now()
FROM public.collections col
JOIN public.products p
  ON p.collection_id = col.id
 AND p.department_id IS NOT NULL
 AND p.deleted_at IS NULL
WHERE col.deleted_at IS NULL
ON CONFLICT (collection_id, department_id) DO NOTHING;

COMMIT;
