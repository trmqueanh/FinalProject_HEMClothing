CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS homepage_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_type VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    gender VARCHAR(30),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    display_limit INTEGER NOT NULL DEFAULT 4,
    display_priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT homepage_sections_display_limit_check CHECK (display_limit > 0)
);

CREATE INDEX IF NOT EXISTS idx_homepage_sections_status
ON homepage_sections(status);

CREATE INDEX IF NOT EXISTS idx_homepage_sections_type_priority
ON homepage_sections(section_type, display_priority);
