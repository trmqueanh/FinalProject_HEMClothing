ALTER TABLE product_materials
DROP CONSTRAINT IF EXISTS product_materials_part_name_check;

ALTER TABLE product_materials
ADD CONSTRAINT product_materials_part_name_check
CHECK (part_name IN ('Main', 'Shell', 'Lining', 'Upper', 'Sole', 'Trim', 'Coating', 'Base fabric'));
