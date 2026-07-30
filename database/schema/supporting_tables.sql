CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS product_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    material_id UUID,
    part_name VARCHAR(40) NOT NULL DEFAULT 'Main',
    material_name VARCHAR(120) NOT NULL,
    material_percent NUMERIC(5, 2),
    sort_order INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT fk_product_materials_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_product_materials_material
        FOREIGN KEY (material_id)
        REFERENCES materials(id)
        ON DELETE SET NULL,
    CONSTRAINT product_materials_part_name_check
        CHECK (part_name IN ('Main', 'Shell', 'Lining', 'Upper', 'Sole', 'Trim', 'Coating', 'Base fabric', 'Frame', 'Temple', 'Lens')),
    CONSTRAINT product_materials_percent_check
        CHECK (material_percent IS NULL OR (material_percent >= 0 AND material_percent <= 100))
);

CREATE TABLE IF NOT EXISTS product_highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    highlight_type VARCHAR(40) NOT NULL DEFAULT 'material_information',
    title VARCHAR(120) NOT NULL DEFAULT 'ADDITIONAL MATERIAL INFORMATION',
    highlight_text TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT fk_product_highlights_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,
    CONSTRAINT product_highlights_material_information_only_check
        CHECK (highlight_type = 'material_information'),
    CONSTRAINT product_highlights_one_material_information
        UNIQUE (product_id, highlight_type)
);

CREATE INDEX IF NOT EXISTS idx_product_materials_product_id
ON product_materials(product_id);

CREATE INDEX IF NOT EXISTS idx_product_materials_material_id
ON product_materials(material_id);

CREATE INDEX IF NOT EXISTS idx_product_highlights_product_id
ON product_highlights(product_id);
