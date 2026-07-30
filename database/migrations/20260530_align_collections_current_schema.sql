-- Align collections with the current simplified schema used by the app.

ALTER TABLE collections
DROP COLUMN IF EXISTS featured,
DROP COLUMN IF EXISTS show_homepage,
DROP COLUMN IF EXISTS display_priority;

DROP INDEX IF EXISTS idx_collections_featured;
DROP INDEX IF EXISTS idx_collections_homepage;

CREATE INDEX IF NOT EXISTS idx_collections_status
ON collections(status);

CREATE INDEX IF NOT EXISTS idx_collections_deleted_at
ON collections(deleted_at);
