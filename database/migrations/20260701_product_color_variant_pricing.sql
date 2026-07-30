ALTER TABLE product_color_variants
    ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10, 2);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_product_color_variants_sale_price_non_negative'
          AND conrelid = 'product_color_variants'::regclass
    ) THEN
        ALTER TABLE product_color_variants
            ADD CONSTRAINT chk_product_color_variants_sale_price_non_negative
            CHECK (sale_price IS NULL OR sale_price >= 0);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_color_variants_sale_price_active
ON product_color_variants(sale_price)
WHERE deleted_at IS NULL
  AND sale_price IS NOT NULL;
