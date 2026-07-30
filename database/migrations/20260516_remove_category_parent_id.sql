ALTER TABLE categories
DROP CONSTRAINT IF EXISTS fk_categories_parent;

DROP INDEX IF EXISTS idx_categories_parent_id;

ALTER TABLE categories
DROP COLUMN IF EXISTS parent_id;
