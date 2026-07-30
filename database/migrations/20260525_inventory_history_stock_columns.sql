ALTER TABLE inventory_logs
ADD COLUMN IF NOT EXISTS old_stock INTEGER,
ADD COLUMN IF NOT EXISTS new_stock INTEGER;

ALTER TABLE inventory_logs
DROP CONSTRAINT IF EXISTS inventory_logs_type_check;

ALTER TABLE inventory_logs
ADD CONSTRAINT inventory_logs_type_check
CHECK (type IN ('import', 'sold', 'sale', 'refund', 'return', 'adjustment', 'release_hold', 'reserve_hold', 'cancel'));
