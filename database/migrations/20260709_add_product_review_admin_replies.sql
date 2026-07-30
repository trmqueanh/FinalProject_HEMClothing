ALTER TABLE product_reviews
ADD COLUMN IF NOT EXISTS admin_reply TEXT,
ADD COLUMN IF NOT EXISTS admin_reply_by UUID,
ADD COLUMN IF NOT EXISTS admin_reply_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_reply_updated_at TIMESTAMP WITH TIME ZONE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_review_admin_reply_by'
  ) THEN
    ALTER TABLE product_reviews
    ADD CONSTRAINT fk_review_admin_reply_by
      FOREIGN KEY (admin_reply_by)
      REFERENCES users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_reviews_admin_reply_by
ON product_reviews(admin_reply_by)
WHERE admin_reply_by IS NOT NULL;
