CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS fits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_group_id UUID REFERENCES product_groups(id),
    department_id UUID REFERENCES departments(id),
    name VARCHAR(80) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_fits_scope
ON fits(product_group_id, department_id, status);
