ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_cancelled_by_check;

UPDATE orders
SET cancelled_by = 'admin'
WHERE cancelled_by = 'system';

ALTER TABLE orders
ADD CONSTRAINT orders_cancelled_by_check
CHECK (cancelled_by IN ('user', 'admin') OR cancelled_by IS NULL);

ALTER TABLE order_status_history
DROP CONSTRAINT IF EXISTS order_status_history_role_check;

UPDATE order_status_history
SET changed_by_role = 'user'
WHERE changed_by_role = 'system';

ALTER TABLE order_status_history
ADD CONSTRAINT order_status_history_role_check
CHECK (changed_by_role IN ('admin', 'user') OR changed_by_role IS NULL);
