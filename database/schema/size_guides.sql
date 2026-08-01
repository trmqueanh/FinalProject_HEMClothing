CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS size_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL UNIQUE,
    title VARCHAR(150) NOT NULL,
    unit VARCHAR(20) DEFAULT 'cm',
    guide_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    CONSTRAINT size_guides_category_id_fkey
        FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE CASCADE
);
