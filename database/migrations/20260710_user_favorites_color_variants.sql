BEGIN;

ALTER TABLE user_favorites
    ADD COLUMN IF NOT EXISTS color_variant_id UUID;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'unique_user_favorite'
          AND conrelid = 'user_favorites'::regclass
    ) THEN
        ALTER TABLE user_favorites
            DROP CONSTRAINT unique_user_favorite;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_favorites_color_variant'
          AND conrelid = 'user_favorites'::regclass
    ) THEN
        ALTER TABLE user_favorites
            ADD CONSTRAINT fk_favorites_color_variant
            FOREIGN KEY (color_variant_id) REFERENCES product_color_variants(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_favorites_color_variant_id
    ON user_favorites(color_variant_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_favorites_unique_product_variant
    ON user_favorites(user_id, product_id, COALESCE(color_variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

COMMIT;
