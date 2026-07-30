ALTER TABLE users
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

UPDATE users
SET status = 'active'
WHERE status IS NULL OR LOWER(status) NOT IN ('active', 'inactive');

ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_status_check;

ALTER TABLE users
ADD CONSTRAINT users_status_check
CHECK (status IN ('active', 'inactive'));

CREATE INDEX IF NOT EXISTS idx_users_status
ON users(status);
