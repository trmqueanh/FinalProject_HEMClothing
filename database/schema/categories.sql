CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    label VARCHAR(100) NOT NULL,
    slug VARCHAR(120) UNIQUE,
    department_id UUID,
    product_group_id UUID,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT categories_department_id_fkey
        FOREIGN KEY (department_id)
        REFERENCES departments(id),
    CONSTRAINT categories_product_group_id_fkey
        FOREIGN KEY (product_group_id)
        REFERENCES product_groups(id)
);

CREATE INDEX IF NOT EXISTS idx_categories_department_id
ON categories(department_id);

CREATE INDEX IF NOT EXISTS idx_categories_product_group_id
ON categories(product_group_id);

CREATE INDEX IF NOT EXISTS idx_categories_status
ON categories(status);

CREATE INDEX IF NOT EXISTS idx_categories_deleted_at
ON categories(deleted_at);
