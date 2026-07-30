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
