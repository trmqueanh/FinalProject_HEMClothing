CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(140) UNIQUE NOT NULL,
    banner_image TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collections_status
ON collections(status);

CREATE INDEX IF NOT EXISTS idx_collections_deleted_at
ON collections(deleted_at);

CREATE UNIQUE INDEX IF NOT EXISTS collections_slug_key
ON collections(slug);

CREATE TABLE IF NOT EXISTS collection_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
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
ON collection_departments(collection_id);

CREATE INDEX IF NOT EXISTS idx_collection_departments_department
ON collection_departments(department_id, status)
WHERE deleted_at IS NULL;
