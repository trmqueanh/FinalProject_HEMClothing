CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS homepage_section_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL,
    item_type VARCHAR(30) NOT NULL,
    item_id UUID NOT NULL,
    display_priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT fk_homepage_section_items_section
        FOREIGN KEY (section_id)
        REFERENCES homepage_sections(id)
        ON DELETE CASCADE,

    CONSTRAINT homepage_section_items_type_check CHECK (item_type IN ('product', 'collection'))
);

CREATE INDEX IF NOT EXISTS idx_homepage_section_items_section
ON homepage_section_items(section_id);

CREATE INDEX IF NOT EXISTS idx_homepage_section_items_item
ON homepage_section_items(item_type, item_id);
