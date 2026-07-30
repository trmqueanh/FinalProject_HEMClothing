CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    color_name VARCHAR(80),
    image_url TEXT NOT NULL,
    alt_text VARCHAR(255),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT fk_product_images_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE
);

ALTER TABLE product_images
ADD COLUMN IF NOT EXISTS alt_text VARCHAR(255);

ALTER TABLE product_images
ALTER COLUMN color_name DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_images_product_id
ON product_images(product_id);

CREATE INDEX IF NOT EXISTS idx_product_images_product_color
ON product_images(product_id, color_name);

CREATE INDEX IF NOT EXISTS idx_product_images_primary
ON product_images(product_id, is_primary, sort_order);
