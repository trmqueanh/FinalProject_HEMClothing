CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    user_id UUID NOT NULL,
    order_id UUID NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    admin_reply TEXT,
    admin_reply_by UUID,
    admin_reply_at TIMESTAMP WITH TIME ZONE,
    admin_reply_updated_at TIMESTAMP WITH TIME ZONE,
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    CONSTRAINT fk_review_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_review_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_review_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_review_admin_reply_by
        FOREIGN KEY (admin_reply_by)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT unique_user_order_product_review
        UNIQUE (user_id, order_id, product_id),

    CONSTRAINT product_reviews_rating_check
        CHECK (rating >= 1 AND rating <= 5)
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id
ON product_reviews(product_id);

CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id
ON product_reviews(user_id);

CREATE INDEX IF NOT EXISTS idx_product_reviews_order_id
ON product_reviews(order_id);

CREATE INDEX IF NOT EXISTS idx_product_reviews_is_approved
ON product_reviews(is_approved);
