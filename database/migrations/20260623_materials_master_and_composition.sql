CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_group_id UUID REFERENCES product_groups(id),
    department_id UUID REFERENCES departments(id),
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(160) UNIQUE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_materials_scope
ON materials(product_group_id, department_id, status);

ALTER TABLE product_materials
ADD COLUMN IF NOT EXISTS material_id UUID,
ADD COLUMN IF NOT EXISTS part_name VARCHAR(40) NOT NULL DEFAULT 'Main',
ADD COLUMN IF NOT EXISTS material_percent NUMERIC(5, 2);

ALTER TABLE product_materials
DROP CONSTRAINT IF EXISTS fk_product_materials_material;

ALTER TABLE product_materials
ADD CONSTRAINT fk_product_materials_material
FOREIGN KEY (material_id)
REFERENCES materials(id)
ON DELETE SET NULL;

ALTER TABLE product_materials
DROP CONSTRAINT IF EXISTS product_materials_part_name_check;

ALTER TABLE product_materials
ADD CONSTRAINT product_materials_part_name_check
CHECK (part_name IN ('Main', 'Shell', 'Lining', 'Upper', 'Sole', 'Trim', 'Coating', 'Base fabric'));

ALTER TABLE product_materials
DROP CONSTRAINT IF EXISTS product_materials_percent_check;

ALTER TABLE product_materials
ADD CONSTRAINT product_materials_percent_check
CHECK (material_percent IS NULL OR (material_percent >= 0 AND material_percent <= 100));

CREATE INDEX IF NOT EXISTS idx_product_materials_material_id
ON product_materials(material_id);
