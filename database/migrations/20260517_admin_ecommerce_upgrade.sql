CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS is_sale BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_homepage BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_priority INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE product_inventory
  ADD COLUMN IF NOT EXISTS color_hex VARCHAR(20),
  ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sold_quantity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS banner_image TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS show_homepage BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_priority INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS variant_id UUID,
  ADD COLUMN IF NOT EXISTS price_at_purchase NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER NOT NULL DEFAULT 0;

UPDATE order_items
SET price_at_purchase = product_price
WHERE price_at_purchase = 0;

ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_order_status_check;

UPDATE orders
SET payment_method = CASE
  WHEN payment_method = 'cash' THEN 'cod'
  WHEN payment_method = 'card' THEN 'bank_transfer'
  ELSE payment_method
END,
payment_status = CASE
  WHEN payment_status = 'pending' THEN 'unpaid'
  ELSE payment_status
END,
order_status = CASE
  WHEN order_status = 'confirmed' THEN 'processing'
  WHEN order_status = 'shipped' THEN 'shipping'
  ELSE order_status
END;

ALTER TABLE orders
ADD CONSTRAINT orders_payment_method_check
CHECK (payment_method IN ('cod', 'bank_transfer'));

ALTER TABLE orders
ADD CONSTRAINT orders_payment_status_check
CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded'));

ALTER TABLE orders
ADD CONSTRAINT orders_order_status_check
CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipping', 'delivered', 'completed', 'cancelled', 'refunded'));

DO $$
BEGIN
  ALTER TABLE product_inventory
    ADD CONSTRAINT inventory_reserved_check CHECK (reserved_quantity >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE product_inventory
    ADD CONSTRAINT inventory_sold_check CHECK (sold_quantity >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE product_inventory
    ADD CONSTRAINT inventory_reserved_not_over_stock_check CHECK (reserved_quantity <= stock_quantity);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE order_items
    ADD CONSTRAINT fk_order_items_variant FOREIGN KEY (variant_id)
    REFERENCES product_inventory(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE categories
DROP CONSTRAINT IF EXISTS fk_categories_parent;

DROP INDEX IF EXISTS idx_categories_parent_id;

ALTER TABLE categories
DROP COLUMN IF EXISTS parent_id;

CREATE TABLE IF NOT EXISTS inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_inventory(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    note TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    discount_type VARCHAR(30) NOT NULL,
    discount_value NUMERIC(12, 2) NOT NULL,
    min_order_amount NUMERIC(12, 2) DEFAULT 0,
    max_discount_amount NUMERIC(12, 2),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    usage_limit INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    old_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    changed_by UUID,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refund_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    admin_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS homepage_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_type VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    gender VARCHAR(30),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    display_limit INTEGER NOT NULL DEFAULT 4,
    display_priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS homepage_section_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES homepage_sections(id) ON DELETE CASCADE,
    item_type VARCHAR(30) NOT NULL,
    item_id UUID NOT NULL,
    display_priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_products_homepage_priority ON products(show_homepage, display_priority, created_at);
CREATE INDEX IF NOT EXISTS idx_product_inventory_color_size ON product_inventory(product_id, color_name, size_label);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_variant_id ON inventory_logs(variant_id);

WITH ranked_primary_images AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY product_id
      ORDER BY sort_order ASC, created_at ASC, id ASC
    ) AS primary_rank
  FROM product_images
  WHERE is_primary = true
)
UPDATE product_images pi
SET is_primary = false
FROM ranked_primary_images ranked
WHERE pi.id = ranked.id
  AND ranked.primary_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_one_primary ON product_images(product_id) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_categories_status ON categories(status);
CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON categories(deleted_at);
CREATE INDEX IF NOT EXISTS idx_collections_status ON collections(status);
CREATE INDEX IF NOT EXISTS idx_collections_homepage ON collections(show_homepage, display_priority, created_at);
CREATE INDEX IF NOT EXISTS idx_collections_deleted_at ON collections(deleted_at);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON order_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);
CREATE INDEX IF NOT EXISTS idx_vouchers_deleted_at ON vouchers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_order ON refund_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_homepage_sections_status ON homepage_sections(status);
CREATE INDEX IF NOT EXISTS idx_homepage_section_items_section ON homepage_section_items(section_id);
