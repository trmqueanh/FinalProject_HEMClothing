ALTER TABLE product_reviews
  ADD COLUMN IF NOT EXISTS order_id UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

ALTER TABLE product_reviews
  ALTER COLUMN comment DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_reviews_user_product_unique'
      AND conrelid = 'product_reviews'::regclass
  ) THEN
    ALTER TABLE product_reviews
      ADD CONSTRAINT product_reviews_user_product_unique UNIQUE (user_id, product_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_review_order'
      AND conrelid = 'product_reviews'::regclass
  ) THEN
    ALTER TABLE product_reviews
      ADD CONSTRAINT fk_review_order
      FOREIGN KEY (order_id)
      REFERENCES orders(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_reviews_order_id
ON product_reviews(order_id);
