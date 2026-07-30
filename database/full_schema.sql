CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS cart_items (
    id UUID DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    size_label VARCHAR(20),
    color_name VARCHAR(80),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT cart_items_pkey
        PRIMARY KEY (id),

    CONSTRAINT cart_items_cart_id_fkey
        FOREIGN KEY (cart_id)
        REFERENCES carts(id)
        ON DELETE CASCADE,

    CONSTRAINT cart_items_product_id_fkey
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,

    CONSTRAINT cart_items_quantity_check
        CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id
ON cart_items(cart_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_product_id
ON cart_items(product_id);
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS carts (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT carts_pkey
        PRIMARY KEY (id),

    CONSTRAINT carts_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT carts_user_id_key
        UNIQUE (user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS carts_user_id_key
ON carts(user_id);
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    label VARCHAR(100) NOT NULL,
    slug VARCHAR(120) UNIQUE,
    department_id UUID,
    product_group_id UUID,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT categories_department_id_fkey
        FOREIGN KEY (department_id)
        REFERENCES departments(id),
    CONSTRAINT categories_product_group_id_fkey
        FOREIGN KEY (product_group_id)
        REFERENCES product_groups(id)
);

CREATE INDEX IF NOT EXISTS idx_categories_department_id
ON categories(department_id);

CREATE INDEX IF NOT EXISTS idx_categories_product_group_id
ON categories(product_group_id);

CREATE INDEX IF NOT EXISTS idx_categories_status
ON categories(status);

CREATE INDEX IF NOT EXISTS idx_categories_deleted_at
ON categories(deleted_at);
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(140) UNIQUE NOT NULL,
    banner_image TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collections_status
ON collections(status);

CREATE INDEX IF NOT EXISTS idx_collections_deleted_at
ON collections(deleted_at);

CREATE UNIQUE INDEX IF NOT EXISTS collections_slug_key
ON collections(slug);

CREATE TABLE IF NOT EXISTS collection_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    banner_image_url TEXT NOT NULL,
    banner_public_id TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT collection_departments_status_check CHECK (status IN ('active', 'inactive')),
    CONSTRAINT collection_departments_unique UNIQUE (collection_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_departments_collection
ON collection_departments(collection_id);

CREATE INDEX IF NOT EXISTS idx_collection_departments_department
ON collection_departments(department_id, status)
WHERE deleted_at IS NULL;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS fits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_group_id UUID REFERENCES product_groups(id),
    department_id UUID REFERENCES departments(id),
    name VARCHAR(80) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_fits_scope
ON fits(product_group_id, department_id, status);
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS homepage_section_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL,
    item_type VARCHAR(30) NOT NULL,
    item_id UUID NOT NULL,
    display_priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT fk_homepage_section_items_section
        FOREIGN KEY (section_id)
        REFERENCES homepage_sections(id)
        ON DELETE CASCADE,

    CONSTRAINT homepage_section_items_type_check CHECK (item_type IN ('product', 'collection'))
);

CREATE INDEX IF NOT EXISTS idx_homepage_section_items_section
ON homepage_section_items(section_id);

CREATE INDEX IF NOT EXISTS idx_homepage_section_items_item
ON homepage_section_items(item_type, item_id);
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS homepage_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_type VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    gender VARCHAR(30),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    display_limit INTEGER NOT NULL DEFAULT 4,
    display_priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT homepage_sections_display_limit_check CHECK (display_limit > 0)
);

CREATE INDEX IF NOT EXISTS idx_homepage_sections_status
ON homepage_sections(status);

CREATE INDEX IF NOT EXISTS idx_homepage_sections_type_priority
ON homepage_sections(section_type, display_priority);
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    variant_id UUID,
    type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    stock_before INTEGER,
    stock_after INTEGER,
    reserved_after INTEGER DEFAULT 0,
    sold_after INTEGER DEFAULT 0,
    note TEXT,
    created_by UUID,
    created_by_role VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT fk_inventory_logs_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_inventory_logs_variant
        FOREIGN KEY (variant_id)
        REFERENCES product_inventory(id)
        ON DELETE SET NULL,

    CONSTRAINT inventory_logs_type_check
        CHECK (type IN ('import', 'sold', 'sale', 'refund', 'return', 'return_restock', 'return_damaged', 'delivery_failed_return', 'adjustment', 'release_hold', 'reserve_hold', 'cancel'))
);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id
ON inventory_logs(product_id);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_variant_id
ON inventory_logs(variant_id);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at
ON inventory_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_by
ON inventory_logs(created_by);
CREATE OR REPLACE FUNCTION get_landing_collections()
RETURNS TABLE (
    type TEXT,
    id UUID,
    name TEXT,
    slug TEXT,
    banner_image TEXT,
    product_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        'collection'::text AS type,
        col.id,
        col.name::text,
        col.slug::text,
        col.banner_image::text,
        COUNT(p.id)::int AS product_count,
        col.created_at
    FROM collections col
    LEFT JOIN products p ON p.collection_id = col.id
    WHERE col.status = 'active'
      AND col.deleted_at IS NULL
    GROUP BY col.id
    ORDER BY col.created_at DESC NULLS LAST, col.name ASC
    LIMIT 2;
$$;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_group_id UUID REFERENCES product_groups(id),
    department_id UUID REFERENCES departments(id),
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(160) UNIQUE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_materials_scope
ON materials(product_group_id, department_id, status);
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    product_id UUID NOT NULL,
    variant_id UUID,
    color_variant_id UUID,
    product_name VARCHAR(255) NOT NULL,
    product_code_at_purchase VARCHAR(160),
    article_number_at_purchase VARCHAR(160),
    product_price NUMERIC(10,2) NOT NULL,
    price_at_purchase NUMERIC(10,2) NOT NULL DEFAULT 0,
    original_price_at_purchase NUMERIC(10,2) NOT NULL DEFAULT 0,
    pricing_mode_at_purchase VARCHAR(30) NOT NULL DEFAULT 'regular',
    quantity INTEGER NOT NULL DEFAULT 1,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    size_label VARCHAR(20),
    color_name VARCHAR(80),
    product_image TEXT,
    gross_line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    item_discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    voucher_discount_allocated NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    refunded_quantity INTEGER NOT NULL DEFAULT 0,
    refunded_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_items_variant
        FOREIGN KEY (variant_id)
        REFERENCES product_inventory(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_items_color_variant
        FOREIGN KEY (color_variant_id)
        REFERENCES product_color_variants(id)
        ON DELETE SET NULL,

    CONSTRAINT order_items_quantity_check CHECK (quantity > 0),
    CONSTRAINT order_items_reserved_quantity_check CHECK (reserved_quantity >= 0),
    CONSTRAINT order_items_product_price_check CHECK (product_price >= 0),
    CONSTRAINT order_items_original_price_at_purchase_check CHECK (original_price_at_purchase >= 0),
    CONSTRAINT order_items_pricing_mode_at_purchase_check CHECK (pricing_mode_at_purchase IN ('regular', 'sale')),
    CONSTRAINT order_items_refunded_quantity_check CHECK (refunded_quantity >= 0 AND refunded_quantity <= quantity),
    CONSTRAINT order_items_refunded_amount_check CHECK (refunded_amount >= 0 AND refunded_amount <= net_line_total),
    CONSTRAINT order_items_refund_allocation_check CHECK (
      gross_line_total >= 0
      AND item_discount_amount >= 0
      AND voucher_discount_allocated >= 0
      AND net_line_total >= 0
      AND net_line_total + voucher_discount_allocated = gross_line_total
    )
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
ON order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_id
ON order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_order_items_variant_id
ON order_items(variant_id);

CREATE INDEX IF NOT EXISTS idx_order_items_color_variant_id
ON order_items(color_variant_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_code_at_purchase
ON order_items(product_code_at_purchase)
WHERE product_code_at_purchase IS NOT NULL;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    old_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    changed_by UUID,
    changed_by_role VARCHAR(20),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT fk_order_status_history_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    CONSTRAINT order_status_history_old_status_check
        CHECK (old_status IN ('pending', 'confirmed', 'processing', 'shipping', 'delivery_failed', 'delivered', 'completed', 'cancelled') OR old_status IS NULL),

    CONSTRAINT order_status_history_new_status_check
        CHECK (new_status IN ('pending', 'confirmed', 'processing', 'shipping', 'delivery_failed', 'delivered', 'completed', 'cancelled')),

    CONSTRAINT order_status_history_role_check
        CHECK (changed_by_role IN ('admin', 'user', 'system') OR changed_by_role IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order
ON order_status_history(order_id);

CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at
ON order_status_history(created_at);
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    voucher_code VARCHAR(100),
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(20) NOT NULL,
    payment_status VARCHAR(30) NOT NULL DEFAULT 'pending_payment',
    order_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    shipping_full_name VARCHAR(120) NOT NULL,
    shipping_phone VARCHAR(30) NOT NULL,
    shipping_city VARCHAR(100) NOT NULL DEFAULT '',
    shipping_district VARCHAR(100) NOT NULL DEFAULT '',
    shipping_ward VARCHAR(100) NOT NULL DEFAULT '',
    shipping_address_line TEXT NOT NULL DEFAULT '',
    shipping_note TEXT,
    cancel_reason TEXT,
    cancelled_by VARCHAR(20),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    refund_amount NUMERIC(10,2),
    refund_method VARCHAR(20),
    returned_to_warehouse_at TIMESTAMP WITH TIME ZONE,
    payment_activated_at TIMESTAMP WITH TIME ZONE,
    payment_expires_at TIMESTAMP WITH TIME ZONE,
    payment_reported_at TIMESTAMP WITH TIME ZONE,
    payment_reviewed_at TIMESTAMP WITH TIME ZONE,
    payment_reviewed_by UUID,
    payment_review_reason TEXT,
    payment_received_amount NUMERIC(12,2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_orders_payment_reviewed_by
        FOREIGN KEY (payment_reviewed_by)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('cod', 'bank_transfer')),
    CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('pending_payment', 'payment_under_review', 'paid', 'payment_expired', 'payment_cancelled', 'refund_pending', 'partially_refunded', 'refunded')),
    CONSTRAINT orders_order_status_check CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipping', 'delivery_failed', 'delivered', 'completed', 'cancelled')),
    CONSTRAINT orders_cancelled_by_check CHECK (cancelled_by IN ('user', 'admin', 'system') OR cancelled_by IS NULL),
    CONSTRAINT orders_refund_method_check CHECK (refund_method IN ('manual') OR refund_method IS NULL),
    CONSTRAINT orders_subtotal_check CHECK (subtotal >= 0),
    CONSTRAINT orders_shipping_fee_check CHECK (shipping_fee >= 0),
    CONSTRAINT orders_discount_amount_check CHECK (discount_amount >= 0 AND discount_amount <= subtotal),
    CONSTRAINT orders_total_amount_check CHECK (total_amount >= 0),
    CONSTRAINT orders_refund_amount_check CHECK (refund_amount IS NULL OR refund_amount >= 0),
    CONSTRAINT orders_payment_received_amount_check CHECK (payment_received_amount IS NULL OR payment_received_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id
ON orders(user_id);

CREATE INDEX IF NOT EXISTS idx_orders_status
ON orders(order_status);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status
ON orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
ON orders(created_at);

CREATE INDEX IF NOT EXISTS idx_orders_payment_method
ON orders(payment_method);

CREATE INDEX IF NOT EXISTS idx_orders_cancelled_at
ON orders(cancelled_at);

CREATE INDEX IF NOT EXISTS idx_orders_completed_at
ON orders(completed_at);

CREATE INDEX IF NOT EXISTS idx_orders_delivered_at
ON orders(delivered_at);

CREATE INDEX IF NOT EXISTS idx_orders_refunded_at
ON orders(refunded_at);

CREATE INDEX IF NOT EXISTS idx_orders_returned_to_warehouse_at
ON orders(returned_to_warehouse_at);

CREATE INDEX IF NOT EXISTS idx_orders_bank_transfer_review
ON orders(payment_method, payment_status)
WHERE payment_method = 'bank_transfer';

CREATE INDEX IF NOT EXISTS idx_orders_bank_transfer_expiry
ON orders(payment_expires_at)
WHERE payment_method = 'bank_transfer'
  AND payment_status = 'pending_payment'
  AND order_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_orders_payment_reviewed_by
ON orders(payment_reviewed_by);
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS product_color_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    color_name VARCHAR(100) NOT NULL,
    color_hex VARCHAR(20),
    color_family VARCHAR(40),
    product_code VARCHAR(160),
    sale_price NUMERIC(10, 2),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_product_color_variants_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_product_color_variants_color_name_not_blank
        CHECK (color_name IS NOT NULL AND LENGTH(TRIM(color_name)) > 0),
    CONSTRAINT chk_product_color_variants_sort_order_non_negative
        CHECK (sort_order >= 0),
    CONSTRAINT chk_product_color_variants_sale_price_non_negative
        CHECK (sale_price IS NULL OR sale_price >= 0),
    CONSTRAINT chk_product_color_variants_color_family_allowed
        CHECK (
            color_family IS NULL OR color_family IN (
                'Black',
                'White',
                'Gray',
                'Beige',
                'Brown',
                'Red',
                'Pink',
                'Purple',
                'Blue',
                'Green',
                'Yellow',
                'Orange',
                'Multi'
            )
        )
);

CREATE INDEX IF NOT EXISTS idx_product_color_variants_product_id
ON product_color_variants(product_id)
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_color_variants_product_color_active
ON product_color_variants(product_id, LOWER(TRIM(color_name)))
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_color_variants_product_code_active
ON product_color_variants(LOWER(TRIM(product_code)))
WHERE deleted_at IS NULL
  AND product_code IS NOT NULL
  AND LENGTH(TRIM(product_code)) > 0;

CREATE INDEX IF NOT EXISTS idx_product_color_variants_color_family
ON product_color_variants(color_family)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_color_variants_sale_price_active
ON product_color_variants(sale_price)
WHERE deleted_at IS NULL
  AND sale_price IS NOT NULL;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS product_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(80) NOT NULL,
    label VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_product_groups_status ON product_groups(status);
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    color_variant_id UUID,
    color_name VARCHAR(80),
    image_url TEXT NOT NULL,
    alt_text VARCHAR(255),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT fk_product_images_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_product_images_color_variant
        FOREIGN KEY (color_variant_id)
        REFERENCES product_color_variants(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id
ON product_images(product_id);

CREATE INDEX IF NOT EXISTS idx_product_images_color_variant_id
ON product_images(color_variant_id);

CREATE INDEX IF NOT EXISTS idx_product_images_product_color
ON product_images(product_id, color_name);

CREATE INDEX IF NOT EXISTS idx_product_images_primary
ON product_images(product_id, is_primary, sort_order);

DROP INDEX IF EXISTS idx_product_images_one_primary;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_one_primary_per_color
ON product_images(product_id, COALESCE(color_name, ''))
WHERE is_primary = true;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS product_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    color_variant_id UUID,
    color_name VARCHAR(80) NOT NULL,
    size_label VARCHAR(20) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    product_code VARCHAR(160),
    article_number VARCHAR(160),
    color_hex VARCHAR(20),
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    sold_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT inventory_stock_check CHECK (stock_quantity >= 0),
    CONSTRAINT inventory_reserved_check CHECK (reserved_quantity >= 0),
    CONSTRAINT inventory_sold_check CHECK (sold_quantity >= 0),
    CONSTRAINT inventory_reserved_not_over_stock_check CHECK (reserved_quantity <= stock_quantity),
    CONSTRAINT unique_product_color_size UNIQUE (product_id, color_name, size_label),
    CONSTRAINT fk_inventory_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_product_inventory_color_variant
        FOREIGN KEY (color_variant_id)
        REFERENCES product_color_variants(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_product_inventory_product_id
ON product_inventory(product_id);

CREATE INDEX IF NOT EXISTS idx_product_inventory_color_variant_id
ON product_inventory(color_variant_id);

CREATE INDEX IF NOT EXISTS idx_product_inventory_color_size
ON product_inventory(product_id, color_name, size_label);

CREATE INDEX IF NOT EXISTS idx_product_inventory_product_code
ON product_inventory(LOWER(TRIM(product_code)))
WHERE product_code IS NOT NULL AND LENGTH(TRIM(product_code)) > 0;

CREATE INDEX IF NOT EXISTS idx_product_inventory_article_number
ON product_inventory(LOWER(TRIM(article_number)))
WHERE article_number IS NOT NULL AND LENGTH(TRIM(article_number)) > 0;
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
-- Run after products.sql, orders.sql, and order_items.sql.
-- Completed order items are the source of truth for products.sold_count.

CREATE OR REPLACE FUNCTION public.calculate_product_sold_count(target_product_id uuid)
RETURNS integer AS $$
  SELECT COALESCE(SUM(oi.quantity - COALESCE(oi.refunded_quantity, 0)), 0)::int
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.product_id = target_product_id
    AND o.order_status = 'completed';
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.products_set_derived_sold_count()
RETURNS trigger AS $$
BEGIN
  NEW.sold_count := public.calculate_product_sold_count(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_set_derived_sold_count_before_write ON products;

CREATE TRIGGER products_set_derived_sold_count_before_write
BEFORE INSERT OR UPDATE OF sold_count
ON products
FOR EACH ROW
EXECUTE FUNCTION public.products_set_derived_sold_count();

CREATE OR REPLACE FUNCTION public.sync_product_sold_count(target_product_id uuid)
RETURNS void AS $$
BEGIN
  IF target_product_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE products
  SET sold_count = public.calculate_product_sold_count(target_product_id),
      updated_at = now()
  WHERE id = target_product_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.sync_product_sold_count_from_order_item()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_product_sold_count(OLD.product_id);
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM public.sync_product_sold_count(NEW.product_id);
    RETURN NEW;
  END IF;

  PERFORM public.sync_product_sold_count(OLD.product_id);

  IF NEW.product_id IS DISTINCT FROM OLD.product_id THEN
    PERFORM public.sync_product_sold_count(NEW.product_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS order_items_sync_product_sold_count_after_write ON order_items;

CREATE TRIGGER order_items_sync_product_sold_count_after_write
AFTER INSERT OR DELETE OR UPDATE OF product_id, order_id, quantity, refunded_quantity
ON order_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_sold_count_from_order_item();

CREATE OR REPLACE FUNCTION public.sync_product_sold_count_from_order_status()
RETURNS trigger AS $$
DECLARE
  affected_product_id uuid;
BEGIN
  IF NEW.order_status IS NOT DISTINCT FROM OLD.order_status THEN
    RETURN NEW;
  END IF;

  FOR affected_product_id IN
    SELECT DISTINCT oi.product_id
    FROM order_items oi
    WHERE oi.order_id = NEW.id
  LOOP
    PERFORM public.sync_product_sold_count(affected_product_id);
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_sync_product_sold_count_after_status ON orders;

CREATE TRIGGER orders_sync_product_sold_count_after_status
AFTER UPDATE OF order_status
ON orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_sold_count_from_order_status();

UPDATE products p
SET sold_count = public.calculate_product_sold_count(p.id),
    updated_at = now();
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    original_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    sale_price NUMERIC(10, 2),
    is_sale BOOLEAN NOT NULL DEFAULT false,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 0,
    reviews INTEGER NOT NULL DEFAULT 0,
    sold_count INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    fit VARCHAR(120),
    fit_id UUID,
    sleeve_length VARCHAR(80),
    garment_length VARCHAR(80),
    neckline VARCHAR(80),
    waist_rise VARCHAR(80),
    heel_height VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    category_id UUID,
    department_id UUID,
    slug VARCHAR(255) UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    collection_id UUID,
    style_id UUID,
    product_group_id UUID,
    pricing_mode VARCHAR(30) NOT NULL DEFAULT 'regular',
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT products_original_price_check CHECK (original_price >= 0),
    CONSTRAINT products_price_check CHECK (price >= 0),
    CONSTRAINT products_status_check CHECK (status IN ('active', 'inactive')),
    CONSTRAINT products_sale_price_check CHECK (sale_price IS NULL OR sale_price >= 0),
    CONSTRAINT products_rating_check CHECK (rating >= 0 AND rating <= 5),
    CONSTRAINT products_reviews_check CHECK (reviews >= 0),
    CONSTRAINT products_sold_count_check CHECK (sold_count >= 0),
    CONSTRAINT products_pricing_mode_check CHECK (pricing_mode IN ('regular', 'sale')),
    CONSTRAINT products_heel_height_check CHECK (
        heel_height IS NULL OR heel_height IN ('High heel', 'Mid heel', 'Low heel', 'No heel')
    ),
    CONSTRAINT products_pricing_state_check CHECK (
        (
            pricing_mode = 'regular'
            AND price = original_price
            AND sale_price IS NULL
            AND is_sale = false
        )
        OR
        (
            pricing_mode = 'sale'
            AND sale_price IS NOT NULL
            AND sale_price < original_price
            AND price = sale_price
            AND is_sale = true
        )
    ),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id),
    CONSTRAINT fk_products_collection FOREIGN KEY (collection_id) REFERENCES collections(id),
    CONSTRAINT fk_products_department FOREIGN KEY (department_id) REFERENCES departments(id),
    CONSTRAINT fk_products_style FOREIGN KEY (style_id) REFERENCES styles(id),
    CONSTRAINT products_product_group_id_fkey FOREIGN KEY (product_group_id) REFERENCES product_groups(id),
    CONSTRAINT products_fit_id_fkey FOREIGN KEY (fit_id) REFERENCES fits(id) ON DELETE SET NULL
);

CREATE OR REPLACE FUNCTION public.products_apply_pricing_contract()
RETURNS trigger AS $$
BEGIN
    NEW.pricing_mode := COALESCE(NULLIF(NEW.pricing_mode, ''), 'regular');

    IF NEW.pricing_mode NOT IN ('regular', 'sale') THEN
        NEW.pricing_mode := 'regular';
    END IF;

    NEW.original_price := COALESCE(NEW.original_price, NEW.price, 0);

    IF NEW.pricing_mode = 'regular' THEN
        NEW.price := NEW.original_price;
        NEW.sale_price := NULL;
        NEW.is_sale := false;
    ELSIF NEW.pricing_mode = 'sale' THEN
        NEW.price := NEW.sale_price;
        NEW.is_sale := true;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_apply_pricing_contract_before_write ON products;

CREATE TRIGGER products_apply_pricing_contract_before_write
BEFORE INSERT OR UPDATE OF
    pricing_mode,
    price,
    original_price,
    sale_price,
    is_sale
ON products
FOR EACH ROW
EXECUTE FUNCTION public.products_apply_pricing_contract();

CREATE INDEX IF NOT EXISTS idx_products_status
ON products(status);

CREATE INDEX IF NOT EXISTS idx_products_deleted_at
ON products(deleted_at);

CREATE INDEX IF NOT EXISTS idx_products_created_at
ON products(created_at);

CREATE INDEX IF NOT EXISTS idx_products_category_id
ON products(category_id);

CREATE INDEX IF NOT EXISTS idx_products_department_id
ON products(department_id);

CREATE INDEX IF NOT EXISTS idx_products_collection_id
ON products(collection_id);

CREATE INDEX IF NOT EXISTS idx_products_style_id
ON products(style_id);

CREATE INDEX IF NOT EXISTS idx_products_product_group_id
ON products(product_group_id);

CREATE INDEX IF NOT EXISTS idx_products_fit_id
ON products(fit_id);

CREATE INDEX IF NOT EXISTS idx_products_sold_count
ON products(sold_count);

CREATE INDEX IF NOT EXISTS idx_products_pricing_mode
ON products(pricing_mode);
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_code VARCHAR(40) NOT NULL UNIQUE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    return_request_id UUID REFERENCES return_requests(id) ON DELETE RESTRICT,
    refund_type VARCHAR(30) NOT NULL,
    source_key VARCHAR(180) NOT NULL UNIQUE,
    requested_amount NUMERIC(12,2) NOT NULL,
    approved_amount NUMERIC(12,2),
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    reason TEXT NOT NULL,
    admin_note TEXT,
    transaction_reference VARCHAR(160),
    failure_reason TEXT,
    refund_bank_code VARCHAR(30),
    refund_bank_name VARCHAR(120),
    refund_account_number VARCHAR(40),
    refund_account_holder VARCHAR(160),
    refund_account_status VARCHAR(30) NOT NULL DEFAULT 'not_provided',
    refund_account_submitted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    processing_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT refunds_type_check CHECK (refund_type IN ('cancellation', 'product_return', 'admin_adjustment')),
    CONSTRAINT refunds_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    CONSTRAINT refunds_account_status_check CHECK (refund_account_status IN ('not_provided', 'ready')),
    CONSTRAINT refunds_account_fields_check CHECK (
      refund_account_status = 'not_provided'
      OR (
        NULLIF(BTRIM(refund_bank_name), '') IS NOT NULL
        AND NULLIF(BTRIM(refund_account_number), '') IS NOT NULL
        AND NULLIF(BTRIM(refund_account_holder), '') IS NOT NULL
      )
    ),
    CONSTRAINT refunds_amount_check CHECK (requested_amount > 0 AND (approved_amount IS NULL OR approved_amount > 0)),
    CONSTRAINT refunds_return_source_check CHECK ((refund_type = 'product_return' AND return_request_id IS NOT NULL) OR refund_type <> 'product_return')
);

CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refunds_user ON refunds(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_refunds_return_request ON refunds(return_request_id) WHERE return_request_id IS NOT NULL;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_request_id UUID NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
    requested_quantity INTEGER NOT NULL,
    approved_quantity INTEGER NOT NULL DEFAULT 0,
    received_quantity INTEGER NOT NULL DEFAULT 0,
    accepted_quantity INTEGER NOT NULL DEFAULT 0,
    rejected_quantity INTEGER NOT NULL DEFAULT 0,
    reason VARCHAR(80) NOT NULL,
    customer_note TEXT,
    evidence_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    condition_code VARCHAR(60),
    inspection_note TEXT,
    rejection_reason TEXT,
    restockable BOOLEAN,
    refund_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    inventory_restored_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT return_items_unique_order_item UNIQUE (return_request_id, order_item_id),
    CONSTRAINT return_items_requested_quantity_check CHECK (requested_quantity > 0),
    CONSTRAINT return_items_quantity_progress_check CHECK (
      approved_quantity >= 0 AND approved_quantity <= requested_quantity
      AND received_quantity >= 0 AND received_quantity <= approved_quantity
      AND accepted_quantity >= 0 AND rejected_quantity >= 0
      AND accepted_quantity + rejected_quantity <= received_quantity
      AND inventory_restored_quantity >= 0 AND inventory_restored_quantity <= accepted_quantity
    ),
    CONSTRAINT return_items_reason_check CHECK (reason IN ('wrong_size', 'not_as_expected', 'changed_mind', 'defective', 'other')),
    CONSTRAINT return_items_refund_amount_check CHECK (refund_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_return_items_request ON return_items(return_request_id);
CREATE INDEX IF NOT EXISTS idx_return_items_order_item ON return_items(order_item_id);
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS return_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_code VARCHAR(40) NOT NULL UNIQUE,
    order_id UUID NOT NULL,
    user_id UUID NOT NULL,
    reason VARCHAR(80) NOT NULL,
    note TEXT,
    return_status VARCHAR(30) NOT NULL DEFAULT 'requested',
    restock BOOLEAN,
    admin_note TEXT,
    rejection_reason TEXT,
    approved_by UUID,
    received_by UUID,
    inspected_by UUID,
    refund_bank_code VARCHAR(30),
    refund_bank_name VARCHAR(120),
    refund_account_number VARCHAR(40),
    refund_account_holder VARCHAR(160),
    refund_account_status VARCHAR(30) NOT NULL DEFAULT 'not_provided',
    refund_account_submitted_at TIMESTAMP WITH TIME ZONE,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE,
    inspection_started_at TIMESTAMP WITH TIME ZONE,
    inspected_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT fk_return_requests_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_return_requests_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_return_requests_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_return_requests_received_by FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_return_requests_inspected_by FOREIGN KEY (inspected_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT return_requests_reason_check
        CHECK (reason IN ('wrong_size', 'not_as_expected', 'changed_mind', 'defective', 'other')),

    CONSTRAINT return_requests_status_check
        CHECK (return_status IN ('requested', 'approved', 'awaiting_return', 'rejected', 'received', 'inspecting', 'inspection_approved', 'inspection_rejected', 'refund_pending', 'completed')),

    CONSTRAINT return_requests_refund_account_status_check
        CHECK (refund_account_status IN ('not_provided', 'ready')),

    CONSTRAINT return_requests_refund_account_fields_check
        CHECK (
            refund_account_status = 'not_provided'
            OR (
                NULLIF(BTRIM(refund_bank_name), '') IS NOT NULL
                AND NULLIF(BTRIM(refund_account_number), '') IS NOT NULL
                AND NULLIF(BTRIM(refund_account_holder), '') IS NOT NULL
            )
        )
);

CREATE INDEX IF NOT EXISTS idx_return_requests_order
ON return_requests(order_id);

CREATE INDEX IF NOT EXISTS idx_return_requests_user
ON return_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_return_requests_status
ON return_requests(return_status);

CREATE INDEX IF NOT EXISTS idx_return_requests_requested_at
ON return_requests(requested_at);

CREATE INDEX IF NOT EXISTS idx_return_requests_order_created
ON return_requests(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_return_requests_refund_account_status
ON return_requests(refund_account_status, updated_at DESC);
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    CONSTRAINT fk_search_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_search_history_user_id
ON search_history(user_id);

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS styles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(80) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    product_group_id UUID REFERENCES product_groups(id),
    department_id UUID REFERENCES departments(id),
    category_id UUID REFERENCES categories(id),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS styles_slug_key
ON styles(slug);

CREATE INDEX IF NOT EXISTS idx_styles_scope
ON styles(product_group_id, department_id, category_id, status);
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS product_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    material_id UUID,
    part_name VARCHAR(40) NOT NULL DEFAULT 'Main',
    material_name VARCHAR(120) NOT NULL,
    material_percent NUMERIC(5, 2),
    sort_order INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT fk_product_materials_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_product_materials_material
        FOREIGN KEY (material_id)
        REFERENCES materials(id)
        ON DELETE SET NULL,
    CONSTRAINT product_materials_part_name_check
        CHECK (part_name IN ('Main', 'Shell', 'Lining', 'Upper', 'Sole', 'Trim', 'Coating', 'Base fabric', 'Frame', 'Temple', 'Lens')),
    CONSTRAINT product_materials_percent_check
        CHECK (material_percent IS NULL OR (material_percent >= 0 AND material_percent <= 100))
);

CREATE TABLE IF NOT EXISTS product_highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    highlight_type VARCHAR(40) NOT NULL DEFAULT 'material_information',
    title VARCHAR(120) NOT NULL DEFAULT 'ADDITIONAL MATERIAL INFORMATION',
    highlight_text TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT fk_product_highlights_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,
    CONSTRAINT product_highlights_material_information_only_check
        CHECK (highlight_type = 'material_information'),
    CONSTRAINT product_highlights_one_material_information
        UNIQUE (product_id, highlight_type)
);

CREATE INDEX IF NOT EXISTS idx_product_materials_product_id
ON product_materials(product_id);

CREATE INDEX IF NOT EXISTS idx_product_materials_material_id
ON product_materials(material_id);

CREATE INDEX IF NOT EXISTS idx_product_highlights_product_id
ON product_highlights(product_id);
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS transactional_email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_key TEXT UNIQUE NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'sending',
    message_id TEXT NOT NULL DEFAULT '',
    preview_only BOOLEAN NOT NULL DEFAULT false,
    smtp_configured BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    sent_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT transactional_email_logs_status_check
      CHECK (status IN ('sending', 'sent', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_transactional_email_logs_recipient
ON transactional_email_logs(recipient_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactional_email_logs_status
ON transactional_email_logs(status, created_at DESC);
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    receiver_name VARCHAR(120) NOT NULL DEFAULT '',
    receiver_phone VARCHAR(30) NOT NULL DEFAULT '',
    country VARCHAR(100) DEFAULT 'Vietnam',
    city VARCHAR(100) NOT NULL DEFAULT '',
    district VARCHAR(100) NOT NULL DEFAULT '',
    ward VARCHAR(100) NOT NULL DEFAULT '',
    address_line TEXT NOT NULL DEFAULT '',
    address_label VARCHAR(50) DEFAULT '',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    CONSTRAINT user_addresses_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS one_default_address_per_user
ON user_addresses(user_id)
WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id
ON user_addresses(user_id);
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
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    full_name VARCHAR(120) NOT NULL DEFAULT '',
    phone VARCHAR(30) NOT NULL DEFAULT '',
    gender VARCHAR(20) NOT NULL DEFAULT '',
    birth_date DATE,
    avatar_url TEXT NOT NULL DEFAULT '',
    payment_provider VARCHAR(50) NOT NULL DEFAULT 'cod',
    card_holder_name VARCHAR(120) NOT NULL DEFAULT '',
    card_last4 VARCHAR(4) NOT NULL DEFAULT '',
    card_brand VARCHAR(30) NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    CONSTRAINT user_profiles_gender_check
      CHECK (gender IN ('male', 'female', 'other', '')),
    CONSTRAINT user_profiles_payment_provider_check
      CHECK (payment_provider IN ('cod', 'bank_transfer')),
    CONSTRAINT user_profiles_card_last4_check
      CHECK (card_last4 ~ '^[0-9]{0,4}$'),
    CONSTRAINT user_profiles_card_brand_check
      CHECK (card_brand IN ('visa', 'mastercard', '')),
    CONSTRAINT user_profiles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_user_id_key
ON user_profiles(user_id);
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    email_verified BOOLEAN NOT NULL DEFAULT false,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    email_verification_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT users_role_check
        CHECK (role IN ('user', 'admin')),
    CONSTRAINT users_status_check
        CHECK (status IN ('active', 'inactive'))
);

CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role);

CREATE INDEX IF NOT EXISTS idx_users_status
ON users(status);

CREATE INDEX IF NOT EXISTS idx_users_pending_email_verification
ON users(email_verification_expires_at)
WHERE email_verified = false;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    discount_type VARCHAR(30) NOT NULL,
    discount_value NUMERIC(12, 2) NOT NULL,
    min_order_amount NUMERIC(12, 2) DEFAULT 0,
    max_discount_amount NUMERIC(12, 2),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    usage_limit INTEGER,
    per_user_limit INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT vouchers_discount_type_check CHECK (discount_type IN ('percent', 'fixed')),
    CONSTRAINT vouchers_discount_value_check CHECK (discount_value > 0),
    CONSTRAINT vouchers_percent_value_check CHECK (discount_type <> 'percent' OR discount_value <= 100),
    CONSTRAINT vouchers_min_order_amount_check CHECK (min_order_amount IS NULL OR min_order_amount >= 0),
    CONSTRAINT vouchers_max_discount_amount_check CHECK (max_discount_amount IS NULL OR max_discount_amount > 0),
    CONSTRAINT vouchers_usage_limit_check CHECK (usage_limit IS NULL OR usage_limit >= 0),
    CONSTRAINT vouchers_per_user_limit_check CHECK (per_user_limit IS NULL OR per_user_limit > 0),
    CONSTRAINT vouchers_used_count_check CHECK (used_count >= 0),
    CONSTRAINT vouchers_status_check CHECK (status IN ('active', 'inactive')),
    CONSTRAINT vouchers_date_range_check CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_vouchers_status
ON vouchers(status);

CREATE INDEX IF NOT EXISTS idx_vouchers_deleted_at
ON vouchers(deleted_at);

CREATE INDEX IF NOT EXISTS idx_vouchers_dates
ON vouchers(start_date, end_date);

CREATE TABLE IF NOT EXISTS voucher_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    voucher_code VARCHAR(100) NOT NULL,
    order_subtotal NUMERIC(12, 2) NOT NULL,
    discount_amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT voucher_redemptions_order_unique UNIQUE (order_id),
    CONSTRAINT voucher_redemptions_subtotal_check CHECK (order_subtotal >= 0),
    CONSTRAINT voucher_redemptions_discount_check CHECK (discount_amount >= 0 AND discount_amount <= order_subtotal)
);

CREATE INDEX IF NOT EXISTS idx_voucher_redemptions_user_voucher
ON voucher_redemptions(user_id, voucher_id, created_at DESC);
