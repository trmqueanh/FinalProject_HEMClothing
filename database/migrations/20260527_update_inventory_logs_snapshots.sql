ALTER TABLE inventory_logs
ADD COLUMN IF NOT EXISTS stock_before INTEGER,
ADD COLUMN IF NOT EXISTS stock_after INTEGER,
ADD COLUMN IF NOT EXISTS reserved_after INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sold_after INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_by_role VARCHAR(20);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'inventory_logs'
      AND column_name = 'old_stock'
  ) THEN
    EXECUTE 'UPDATE inventory_logs SET stock_before = COALESCE(stock_before, old_stock) WHERE stock_before IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'inventory_logs'
      AND column_name = 'new_stock'
  ) THEN
    EXECUTE 'UPDATE inventory_logs SET stock_after = COALESCE(stock_after, new_stock) WHERE stock_after IS NULL';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at
ON inventory_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_by
ON inventory_logs(created_by);
