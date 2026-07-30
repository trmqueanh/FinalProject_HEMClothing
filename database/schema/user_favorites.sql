CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    product_id UUID NOT NULL,
    color_variant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT fk_favorites_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_favorites_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_favorites_color_variant
        FOREIGN KEY (color_variant_id)
        REFERENCES product_color_variants(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id
ON user_favorites(user_id);

CREATE INDEX IF NOT EXISTS idx_user_favorites_color_variant_id
ON user_favorites(color_variant_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_favorites_unique_product_variant
ON user_favorites(user_id, product_id, color_variant_id);
