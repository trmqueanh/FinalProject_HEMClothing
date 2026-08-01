--
-- PostgreSQL database dump
--

\restrict EVC2r3Xgaz88juVfhbPQQB2BKGs0oChUeZ67PHe27jvFeERiOxF1QNgigByrc3W

-- Dumped from database version 18.4 (df16b3c)
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: calculate_product_sold_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_product_sold_count(target_product_id uuid) RETURNS integer
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(SUM(oi.quantity - COALESCE(oi.refunded_quantity, 0)), 0)::int
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.product_id = target_product_id
    AND o.order_status = 'completed';
$$;


--
-- Name: get_landing_collections(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_landing_collections() RETURNS TABLE(type text, id uuid, name text, slug text, banner_image text, product_count integer, created_at timestamp with time zone)
    LANGUAGE sql STABLE
    AS $$
    SELECT
        'collection'::text AS type,
        col.id,
        col.name::text,
        col.slug::text,
        col.banner_image::text,
        COUNT(p.id)::int AS product_count,
        col.created_at
    FROM public.collections col
    LEFT JOIN public.products p ON p.collection_id = col.id
    WHERE col.status = 'active'
      AND col.deleted_at IS NULL
    GROUP BY col.id
    ORDER BY col.created_at DESC NULLS LAST, col.name ASC
    LIMIT 2;
$$;


--
-- Name: products_apply_pricing_contract(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.products_apply_pricing_contract() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: products_set_derived_sold_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.products_set_derived_sold_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.sold_count := public.calculate_product_sold_count(NEW.id);
  RETURN NEW;
END;
$$;


--
-- Name: sync_product_sold_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_product_sold_count(target_product_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF target_product_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE products
  SET sold_count = public.calculate_product_sold_count(target_product_id),
      updated_at = now()
  WHERE id = target_product_id;
END;
$$;


--
-- Name: sync_product_sold_count_from_order_item(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_product_sold_count_from_order_item() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: sync_product_sold_count_from_order_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_product_sold_count_from_order_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cart_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    size_label character varying(20),
    color_name character varying(80),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    color_variant_id uuid,
    CONSTRAINT cart_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: carts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    label character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    slug character varying(120),
    department_id uuid,
    status character varying(30) DEFAULT 'active'::character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    product_group_id uuid
);


--
-- Name: collection_departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collection_departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    collection_id uuid NOT NULL,
    department_id uuid NOT NULL,
    banner_image_url text NOT NULL,
    banner_public_id text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT collection_departments_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);


--
-- Name: collections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(120) NOT NULL,
    slug character varying(140) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    banner_image text,
    status character varying(30) DEFAULT 'active'::character varying NOT NULL,
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: currency_conversion_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.currency_conversion_log (
    migration_name character varying(120) NOT NULL,
    converted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    label character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: fits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_group_id uuid,
    name character varying(80) NOT NULL,
    slug character varying(100) NOT NULL,
    status character varying(30) DEFAULT 'active'::character varying NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    department_id uuid
);


--
-- Name: inventory_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    variant_id uuid,
    type character varying(50) NOT NULL,
    quantity integer NOT NULL,
    note text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    stock_before integer,
    stock_after integer,
    reserved_after integer DEFAULT 0,
    sold_after integer DEFAULT 0,
    created_by_role character varying(20),
    CONSTRAINT inventory_logs_type_check CHECK (((type)::text = ANY ((ARRAY['import'::character varying, 'sold'::character varying, 'sale'::character varying, 'refund'::character varying, 'return'::character varying, 'return_restock'::character varying, 'return_damaged'::character varying, 'delivery_failed_return'::character varying, 'adjustment'::character varying, 'release_hold'::character varying, 'reserve_hold'::character varying, 'cancel'::character varying])::text[])))
);


--
-- Name: materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_group_id uuid,
    department_id uuid,
    name character varying(120) NOT NULL,
    slug character varying(180) NOT NULL,
    status character varying(30) DEFAULT 'active'::character varying NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    product_name character varying(255) NOT NULL,
    product_price numeric(10,2) NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    size_label character varying(20),
    color_name character varying(80),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    product_image text,
    variant_id uuid,
    price_at_purchase numeric(10,2) DEFAULT 0 NOT NULL,
    reserved_quantity integer DEFAULT 0 NOT NULL,
    original_price_at_purchase numeric(10,2) DEFAULT 0 NOT NULL,
    pricing_mode_at_purchase character varying(30) DEFAULT 'regular'::character varying NOT NULL,
    color_variant_id uuid,
    product_code_at_purchase character varying(160),
    article_number_at_purchase character varying(160),
    gross_line_total numeric(12,2) DEFAULT 0 NOT NULL,
    item_discount_amount numeric(12,2) DEFAULT 0 NOT NULL,
    voucher_discount_allocated numeric(12,2) DEFAULT 0 NOT NULL,
    net_line_total numeric(12,2) DEFAULT 0 NOT NULL,
    refunded_quantity integer DEFAULT 0 NOT NULL,
    refunded_amount numeric(12,2) DEFAULT 0 NOT NULL,
    CONSTRAINT order_items_original_price_at_purchase_check CHECK ((original_price_at_purchase >= (0)::numeric)),
    CONSTRAINT order_items_pricing_mode_at_purchase_check CHECK (((pricing_mode_at_purchase)::text = ANY ((ARRAY['regular'::character varying, 'sale'::character varying])::text[]))),
    CONSTRAINT order_items_product_price_check CHECK ((product_price >= (0)::numeric)),
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT order_items_refund_allocation_check CHECK (((gross_line_total >= (0)::numeric) AND (item_discount_amount >= (0)::numeric) AND (voucher_discount_allocated >= (0)::numeric) AND (net_line_total >= (0)::numeric) AND ((net_line_total + voucher_discount_allocated) = gross_line_total))),
    CONSTRAINT order_items_refunded_amount_check CHECK (((refunded_amount >= (0)::numeric) AND (refunded_amount <= net_line_total))),
    CONSTRAINT order_items_refunded_quantity_check CHECK (((refunded_quantity >= 0) AND (refunded_quantity <= quantity)))
);


--
-- Name: COLUMN order_items.product_code_at_purchase; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_items.product_code_at_purchase IS 'Snapshot of the customer-facing color-level product code at order time.';


--
-- Name: COLUMN order_items.article_number_at_purchase; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_items.article_number_at_purchase IS 'Snapshot of the customer-facing color-level article number at order time.';


--
-- Name: order_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    old_status character varying(30),
    new_status character varying(30) NOT NULL,
    changed_by uuid,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by_role character varying(20),
    CONSTRAINT order_status_history_new_status_check CHECK (((new_status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'processing'::character varying, 'shipping'::character varying, 'delivery_failed'::character varying, 'delivered'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT order_status_history_old_status_check CHECK ((((old_status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'processing'::character varying, 'shipping'::character varying, 'delivery_failed'::character varying, 'delivered'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])) OR (old_status IS NULL))),
    CONSTRAINT order_status_history_role_check CHECK ((((changed_by_role)::text = ANY ((ARRAY['admin'::character varying, 'user'::character varying, 'system'::character varying])::text[])) OR (changed_by_role IS NULL)))
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    shipping_fee numeric(10,2) DEFAULT 0 NOT NULL,
    total_amount numeric(10,2) DEFAULT 0 NOT NULL,
    payment_method character varying(20) NOT NULL,
    payment_status character varying(20) DEFAULT 'pending_payment'::character varying NOT NULL,
    order_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    shipping_full_name character varying(120) NOT NULL,
    shipping_phone character varying(30) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    shipping_city character varying(100) DEFAULT ''::character varying NOT NULL,
    shipping_district character varying(100) DEFAULT ''::character varying NOT NULL,
    shipping_ward character varying(100) DEFAULT ''::character varying NOT NULL,
    shipping_address_line text DEFAULT ''::text NOT NULL,
    shipping_note text,
    cancel_reason text,
    cancelled_by character varying(20),
    cancelled_at timestamp with time zone,
    completed_at timestamp with time zone,
    refunded_at timestamp with time zone,
    voucher_code character varying(100),
    discount_amount numeric(10,2) DEFAULT 0 NOT NULL,
    refund_amount numeric(10,2),
    refund_method character varying(20),
    returned_to_warehouse_at timestamp with time zone,
    payment_expires_at timestamp with time zone,
    payment_reported_at timestamp with time zone,
    payment_reviewed_at timestamp with time zone,
    payment_reviewed_by uuid,
    payment_review_reason text,
    payment_received_amount numeric(12,2),
    delivered_at timestamp with time zone,
    payment_activated_at timestamp with time zone,
    CONSTRAINT orders_cancelled_by_check CHECK ((((cancelled_by)::text = ANY ((ARRAY['user'::character varying, 'admin'::character varying, 'system'::character varying])::text[])) OR (cancelled_by IS NULL))),
    CONSTRAINT orders_discount_amount_check CHECK (((discount_amount >= (0)::numeric) AND (discount_amount <= subtotal))),
    CONSTRAINT orders_order_status_check CHECK (((order_status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'processing'::character varying, 'shipping'::character varying, 'delivery_failed'::character varying, 'delivered'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT orders_payment_method_check CHECK (((payment_method)::text = ANY ((ARRAY['cod'::character varying, 'bank_transfer'::character varying])::text[]))),
    CONSTRAINT orders_payment_received_amount_check CHECK (((payment_received_amount IS NULL) OR (payment_received_amount >= (0)::numeric))),
    CONSTRAINT orders_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['pending_payment'::character varying, 'payment_under_review'::character varying, 'paid'::character varying, 'payment_expired'::character varying, 'payment_cancelled'::character varying, 'refund_pending'::character varying, 'partially_refunded'::character varying, 'refunded'::character varying])::text[]))),
    CONSTRAINT orders_refund_amount_check CHECK (((refund_amount IS NULL) OR (refund_amount >= (0)::numeric))),
    CONSTRAINT orders_refund_method_check CHECK ((((refund_method)::text = 'manual'::text) OR (refund_method IS NULL))),
    CONSTRAINT orders_shipping_fee_check CHECK ((shipping_fee >= (0)::numeric)),
    CONSTRAINT orders_subtotal_check CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT orders_total_amount_check CHECK ((total_amount >= (0)::numeric))
);


--
-- Name: product_color_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_color_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    color_name character varying(100) NOT NULL,
    color_hex character varying(20),
    product_code character varying(160),
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    color_family character varying(40),
    sale_price numeric(10,2),
    CONSTRAINT chk_product_color_variants_color_family_allowed CHECK (((color_family IS NULL) OR ((color_family)::text = ANY ((ARRAY['Black'::character varying, 'White'::character varying, 'Gray'::character varying, 'Beige'::character varying, 'Brown'::character varying, 'Red'::character varying, 'Pink'::character varying, 'Purple'::character varying, 'Blue'::character varying, 'Green'::character varying, 'Yellow'::character varying, 'Orange'::character varying, 'Multi'::character varying])::text[])))),
    CONSTRAINT chk_product_color_variants_color_name_not_blank CHECK (((color_name IS NOT NULL) AND (length(TRIM(BOTH FROM color_name)) > 0))),
    CONSTRAINT chk_product_color_variants_sale_price_non_negative CHECK (((sale_price IS NULL) OR (sale_price >= (0)::numeric))),
    CONSTRAINT chk_product_color_variants_sort_order_non_negative CHECK ((sort_order >= 0))
);


--
-- Name: TABLE product_color_variants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.product_color_variants IS 'Customer-facing color variants. Each product color has its own product code/article number; sizes remain inventory rows.';


--
-- Name: COLUMN product_color_variants.product_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_color_variants.product_code IS 'Customer-facing color-level product code/article number shown on product, cart, checkout, and order screens.';


--
-- Name: COLUMN product_color_variants.color_family; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_color_variants.color_family IS 'Customer-friendly color family used for storefront color filters while preserving exact color_name.';


--
-- Name: product_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    label character varying(100) NOT NULL,
    slug character varying(120) NOT NULL,
    status character varying(30) DEFAULT 'active'::character varying NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: product_highlights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_highlights (
    id bigint NOT NULL,
    product_id uuid NOT NULL,
    highlight_text text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    highlight_type character varying(50) DEFAULT 'material_information'::character varying NOT NULL,
    title character varying(160),
    CONSTRAINT product_highlights_type_check CHECK (((highlight_type)::text = 'material_information'::text))
);


--
-- Name: product_highlights_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_highlights_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_highlights_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_highlights_id_seq OWNED BY public.product_highlights.id;


--
-- Name: product_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    color_name character varying(80),
    image_url text NOT NULL,
    alt_text character varying(255),
    is_primary boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    color_variant_id uuid
);


--
-- Name: product_inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    color_name character varying(80) NOT NULL,
    size_label character varying(20) NOT NULL,
    stock_quantity integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    color_hex character varying(20),
    reserved_quantity integer DEFAULT 0 NOT NULL,
    sold_quantity integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    color_variant_id uuid,
    product_code character varying(160),
    article_number character varying(160),
    CONSTRAINT inventory_reserved_check CHECK ((reserved_quantity >= 0)),
    CONSTRAINT inventory_reserved_not_over_stock_check CHECK ((reserved_quantity <= stock_quantity)),
    CONSTRAINT inventory_sold_check CHECK ((sold_quantity >= 0)),
    CONSTRAINT inventory_stock_check CHECK ((stock_quantity >= 0))
);


--
-- Name: COLUMN product_inventory.product_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_inventory.product_code IS 'Customer-facing color-level product code duplicated on each size row for the same product color.';


--
-- Name: COLUMN product_inventory.article_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_inventory.article_number IS 'Optional customer-facing article number, normally same as product_code.';


--
-- Name: product_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_materials (
    id bigint NOT NULL,
    product_id uuid NOT NULL,
    material_name character varying(120) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    part_name character varying(80) DEFAULT 'Main'::character varying NOT NULL,
    material_percent numeric(5,2),
    material_id uuid,
    CONSTRAINT product_materials_part_name_check CHECK (((part_name)::text = ANY ((ARRAY['Main'::character varying, 'Shell'::character varying, 'Lining'::character varying, 'Upper'::character varying, 'Sole'::character varying, 'Trim'::character varying, 'Coating'::character varying, 'Base fabric'::character varying, 'Frame'::character varying, 'Temple'::character varying, 'Lens'::character varying])::text[]))),
    CONSTRAINT product_materials_percent_check CHECK (((material_percent IS NULL) OR ((material_percent >= (0)::numeric) AND (material_percent <= (100)::numeric))))
);


--
-- Name: product_materials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_materials_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_materials_id_seq OWNED BY public.product_materials.id;


--
-- Name: product_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating integer NOT NULL,
    comment text,
    is_approved boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    order_id uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    admin_reply text,
    admin_reply_by uuid,
    admin_reply_at timestamp with time zone,
    admin_reply_updated_at timestamp with time zone,
    CONSTRAINT product_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    original_price numeric(10,2) DEFAULT 0 NOT NULL,
    rating numeric(3,2) DEFAULT 0 NOT NULL,
    reviews integer DEFAULT 0 NOT NULL,
    description text,
    fit character varying(120),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category_id uuid,
    department_id uuid,
    slug character varying(255),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    collection_id uuid,
    sold_count integer DEFAULT 0 NOT NULL,
    style_id uuid,
    sale_price numeric(10,2),
    is_sale boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    pricing_mode character varying(30) DEFAULT 'regular'::character varying NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    product_group_id uuid,
    fit_id uuid,
    heel_height character varying(30),
    sleeve_length character varying(80),
    garment_length character varying(80),
    neckline character varying(80),
    waist_rise character varying(80),
    CONSTRAINT products_heel_height_check CHECK (((heel_height IS NULL) OR ((heel_height)::text = ANY ((ARRAY['High heel'::character varying, 'Mid heel'::character varying, 'Low heel'::character varying, 'No heel'::character varying])::text[])))),
    CONSTRAINT products_original_price_check CHECK ((original_price >= (0)::numeric)),
    CONSTRAINT products_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT products_pricing_mode_check CHECK (((pricing_mode)::text = ANY ((ARRAY['regular'::character varying, 'sale'::character varying])::text[]))),
    CONSTRAINT products_pricing_state_check CHECK (((((pricing_mode)::text = 'regular'::text) AND (price = original_price) AND (sale_price IS NULL) AND (is_sale = false)) OR (((pricing_mode)::text = 'sale'::text) AND (sale_price IS NOT NULL) AND (sale_price < original_price) AND (price = sale_price) AND (is_sale = true)))),
    CONSTRAINT products_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric))),
    CONSTRAINT products_reviews_check CHECK ((reviews >= 0)),
    CONSTRAINT products_sale_price_check CHECK (((sale_price IS NULL) OR (sale_price >= (0)::numeric))),
    CONSTRAINT products_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);


--
-- Name: refunds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refunds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    refund_code character varying(40) NOT NULL,
    order_id uuid NOT NULL,
    user_id uuid NOT NULL,
    return_request_id uuid,
    refund_type character varying(30) NOT NULL,
    source_key character varying(180) NOT NULL,
    requested_amount numeric(12,2) NOT NULL,
    approved_amount numeric(12,2),
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    reason text NOT NULL,
    admin_note text,
    transaction_reference character varying(160),
    failure_reason text,
    created_by uuid,
    processed_by uuid,
    processing_at timestamp with time zone,
    completed_at timestamp with time zone,
    failed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    refund_bank_code character varying(30),
    refund_bank_name character varying(120),
    refund_account_number character varying(40),
    refund_account_holder character varying(160),
    refund_account_status character varying(30) DEFAULT 'not_provided'::character varying NOT NULL,
    refund_account_submitted_at timestamp with time zone,
    CONSTRAINT refunds_account_fields_check CHECK ((((refund_account_status)::text = 'not_provided'::text) OR ((NULLIF(btrim((refund_bank_name)::text), ''::text) IS NOT NULL) AND (NULLIF(btrim((refund_account_number)::text), ''::text) IS NOT NULL) AND (NULLIF(btrim((refund_account_holder)::text), ''::text) IS NOT NULL)))),
    CONSTRAINT refunds_account_status_check CHECK (((refund_account_status)::text = ANY ((ARRAY['not_provided'::character varying, 'ready'::character varying])::text[]))),
    CONSTRAINT refunds_amount_check CHECK (((requested_amount > (0)::numeric) AND ((approved_amount IS NULL) OR (approved_amount > (0)::numeric)))),
    CONSTRAINT refunds_return_source_check CHECK (((((refund_type)::text = 'product_return'::text) AND (return_request_id IS NOT NULL)) OR ((refund_type)::text <> 'product_return'::text))),
    CONSTRAINT refunds_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT refunds_type_check CHECK (((refund_type)::text = ANY ((ARRAY['cancellation'::character varying, 'product_return'::character varying, 'admin_adjustment'::character varying])::text[])))
);


--
-- Name: return_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.return_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    return_request_id uuid NOT NULL,
    order_item_id uuid NOT NULL,
    requested_quantity integer NOT NULL,
    approved_quantity integer DEFAULT 0 NOT NULL,
    received_quantity integer DEFAULT 0 NOT NULL,
    accepted_quantity integer DEFAULT 0 NOT NULL,
    rejected_quantity integer DEFAULT 0 NOT NULL,
    reason character varying(80) NOT NULL,
    customer_note text,
    evidence_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    condition_code character varying(60),
    inspection_note text,
    rejection_reason text,
    restockable boolean,
    refund_amount numeric(12,2) DEFAULT 0 NOT NULL,
    inventory_restored_quantity integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT return_items_quantity_progress_check CHECK (((approved_quantity >= 0) AND (approved_quantity <= requested_quantity) AND (received_quantity >= 0) AND (received_quantity <= approved_quantity) AND (accepted_quantity >= 0) AND (rejected_quantity >= 0) AND ((accepted_quantity + rejected_quantity) <= received_quantity) AND (inventory_restored_quantity >= 0) AND (inventory_restored_quantity <= accepted_quantity))),
    CONSTRAINT return_items_reason_check CHECK (((reason)::text = ANY ((ARRAY['wrong_size'::character varying, 'not_as_expected'::character varying, 'changed_mind'::character varying, 'defective'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT return_items_refund_amount_check CHECK ((refund_amount >= (0)::numeric)),
    CONSTRAINT return_items_requested_quantity_check CHECK ((requested_quantity > 0))
);


--
-- Name: return_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.return_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reason character varying(80) NOT NULL,
    note text,
    return_status character varying(30) DEFAULT 'requested'::character varying NOT NULL,
    restock boolean,
    admin_note text,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_at timestamp with time zone,
    rejected_at timestamp with time zone,
    received_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    return_code character varying(40) NOT NULL,
    rejection_reason text,
    approved_by uuid,
    received_by uuid,
    inspected_by uuid,
    inspection_started_at timestamp with time zone,
    inspected_at timestamp with time zone,
    refund_bank_code character varying(30),
    refund_bank_name character varying(120),
    refund_account_number character varying(40),
    refund_account_holder character varying(160),
    refund_account_status character varying(30) DEFAULT 'not_provided'::character varying NOT NULL,
    refund_account_submitted_at timestamp with time zone,
    refund_account_verified_at timestamp with time zone,
    refund_account_verified_by uuid,
    refund_account_rejection_reason text,
    CONSTRAINT return_requests_reason_check CHECK (((reason)::text = ANY ((ARRAY['wrong_size'::character varying, 'not_as_expected'::character varying, 'changed_mind'::character varying, 'defective'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT return_requests_refund_account_fields_check CHECK ((((refund_account_status)::text = 'not_provided'::text) OR ((NULLIF(btrim((refund_bank_name)::text), ''::text) IS NOT NULL) AND (NULLIF(btrim((refund_account_number)::text), ''::text) IS NOT NULL) AND (NULLIF(btrim((refund_account_holder)::text), ''::text) IS NOT NULL)))),
    CONSTRAINT return_requests_refund_account_status_check CHECK (((refund_account_status)::text = ANY ((ARRAY['not_provided'::character varying, 'ready'::character varying])::text[]))),
    CONSTRAINT return_requests_status_check CHECK (((return_status)::text = ANY ((ARRAY['requested'::character varying, 'approved'::character varying, 'awaiting_return'::character varying, 'rejected'::character varying, 'received'::character varying, 'inspecting'::character varying, 'inspection_approved'::character varying, 'inspection_rejected'::character varying, 'refund_pending'::character varying, 'completed'::character varying])::text[])))
);


--
-- Name: search_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.search_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    keyword character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: size_guides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.size_guides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid NOT NULL,
    title character varying(150) NOT NULL,
    unit character varying(20) DEFAULT 'cm'::character varying,
    guide_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: styles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.styles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(80) NOT NULL,
    slug character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    product_group_id uuid,
    department_id uuid,
    category_id uuid,
    status character varying(30) DEFAULT 'active'::character varying NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: transactional_email_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactional_email_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_key text NOT NULL,
    recipient_email character varying(255) NOT NULL,
    subject text NOT NULL,
    status character varying(20) DEFAULT 'sending'::character varying NOT NULL,
    message_id text DEFAULT ''::text NOT NULL,
    preview_only boolean DEFAULT false NOT NULL,
    smtp_configured boolean DEFAULT false NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    error_message text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transactional_email_logs_status_check CHECK (((status)::text = ANY ((ARRAY['sending'::character varying, 'sent'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: user_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    receiver_name character varying(120) DEFAULT ''::character varying NOT NULL,
    receiver_phone character varying(30) DEFAULT ''::character varying NOT NULL,
    country character varying(100) DEFAULT 'Vietnam'::character varying,
    city character varying(100) DEFAULT ''::character varying NOT NULL,
    district character varying(100) DEFAULT ''::character varying NOT NULL,
    ward character varying(100) DEFAULT ''::character varying NOT NULL,
    address_line text DEFAULT ''::text NOT NULL,
    address_label character varying(50) DEFAULT ''::character varying,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_favorites (
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    color_variant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name character varying(120) DEFAULT ''::character varying NOT NULL,
    phone character varying(30) DEFAULT ''::character varying NOT NULL,
    gender character varying(20) DEFAULT ''::character varying NOT NULL,
    birth_date date,
    payment_provider character varying(50) DEFAULT 'cod'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_profiles_gender_check CHECK (((gender)::text = ANY ((ARRAY['male'::character varying, 'female'::character varying, 'other'::character varying, ''::character varying])::text[]))),
    CONSTRAINT user_profiles_payment_provider_check CHECK (((payment_provider)::text = ANY ((ARRAY['cod'::character varying, 'bank_transfer'::character varying])::text[])))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(120) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    role character varying(20) DEFAULT 'user'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    email_verified_at timestamp with time zone,
    email_verification_expires_at timestamp with time zone,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'admin'::character varying])::text[]))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);


--
-- Name: voucher_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voucher_redemptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    voucher_id uuid NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid NOT NULL,
    voucher_code character varying(100) NOT NULL,
    order_subtotal numeric(12,2) NOT NULL,
    discount_amount numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT voucher_redemptions_discount_check CHECK (((discount_amount >= (0)::numeric) AND (discount_amount <= order_subtotal))),
    CONSTRAINT voucher_redemptions_subtotal_check CHECK ((order_subtotal >= (0)::numeric))
);


--
-- Name: vouchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vouchers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(100) NOT NULL,
    discount_type character varying(30) NOT NULL,
    discount_value numeric(12,2) NOT NULL,
    min_order_amount numeric(12,2) DEFAULT 0,
    max_discount_amount numeric(12,2),
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    usage_limit integer,
    used_count integer DEFAULT 0,
    status character varying(30) DEFAULT 'active'::character varying NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    per_user_limit integer DEFAULT 1,
    CONSTRAINT vouchers_date_range_check CHECK ((end_date > start_date)),
    CONSTRAINT vouchers_discount_type_check CHECK (((discount_type)::text = ANY ((ARRAY['percent'::character varying, 'fixed'::character varying])::text[]))),
    CONSTRAINT vouchers_discount_value_check CHECK ((discount_value > (0)::numeric)),
    CONSTRAINT vouchers_max_discount_amount_check CHECK (((max_discount_amount IS NULL) OR (max_discount_amount > (0)::numeric))),
    CONSTRAINT vouchers_min_order_amount_check CHECK (((min_order_amount IS NULL) OR (min_order_amount >= (0)::numeric))),
    CONSTRAINT vouchers_per_user_limit_check CHECK (((per_user_limit IS NULL) OR (per_user_limit > 0))),
    CONSTRAINT vouchers_percent_value_check CHECK ((((discount_type)::text <> 'percent'::text) OR (discount_value <= (100)::numeric))),
    CONSTRAINT vouchers_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[]))),
    CONSTRAINT vouchers_usage_limit_check CHECK (((usage_limit IS NULL) OR (usage_limit >= 0))),
    CONSTRAINT vouchers_used_count_check CHECK ((used_count >= 0))
);


--
-- Name: product_highlights id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_highlights ALTER COLUMN id SET DEFAULT nextval('public.product_highlights_id_seq'::regclass);


--
-- Name: product_materials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_materials ALTER COLUMN id SET DEFAULT nextval('public.product_materials_id_seq'::regclass);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- Name: carts carts_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_key UNIQUE (user_id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: collection_departments collection_departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_departments
    ADD CONSTRAINT collection_departments_pkey PRIMARY KEY (id);


--
-- Name: collection_departments collection_departments_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_departments
    ADD CONSTRAINT collection_departments_unique UNIQUE (collection_id, department_id);


--
-- Name: collections collections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT collections_pkey PRIMARY KEY (id);


--
-- Name: collections collections_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT collections_slug_key UNIQUE (slug);


--
-- Name: currency_conversion_log currency_conversion_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.currency_conversion_log
    ADD CONSTRAINT currency_conversion_log_pkey PRIMARY KEY (migration_name);


--
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: fits fits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fits
    ADD CONSTRAINT fits_pkey PRIMARY KEY (id);


--
-- Name: fits fits_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fits
    ADD CONSTRAINT fits_slug_key UNIQUE (slug);


--
-- Name: inventory_logs inventory_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_logs
    ADD CONSTRAINT inventory_logs_pkey PRIMARY KEY (id);


--
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);


--
-- Name: materials materials_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_slug_key UNIQUE (slug);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: product_color_variants product_color_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_color_variants
    ADD CONSTRAINT product_color_variants_pkey PRIMARY KEY (id);


--
-- Name: product_groups product_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_groups
    ADD CONSTRAINT product_groups_pkey PRIMARY KEY (id);


--
-- Name: product_groups product_groups_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_groups
    ADD CONSTRAINT product_groups_slug_key UNIQUE (slug);


--
-- Name: product_highlights product_highlights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_highlights
    ADD CONSTRAINT product_highlights_pkey PRIMARY KEY (id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: product_inventory product_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_inventory
    ADD CONSTRAINT product_inventory_pkey PRIMARY KEY (id);


--
-- Name: product_materials product_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_materials
    ADD CONSTRAINT product_materials_pkey PRIMARY KEY (id);


--
-- Name: product_reviews product_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- Name: refunds refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_pkey PRIMARY KEY (id);


--
-- Name: refunds refunds_refund_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_refund_code_unique UNIQUE (refund_code);


--
-- Name: refunds refunds_source_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_source_key_unique UNIQUE (source_key);


--
-- Name: return_items return_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_items
    ADD CONSTRAINT return_items_pkey PRIMARY KEY (id);


--
-- Name: return_items return_items_unique_order_item; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_items
    ADD CONSTRAINT return_items_unique_order_item UNIQUE (return_request_id, order_item_id);


--
-- Name: return_requests return_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_requests
    ADD CONSTRAINT return_requests_pkey PRIMARY KEY (id);


--
-- Name: search_history search_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_history
    ADD CONSTRAINT search_history_pkey PRIMARY KEY (id);


--
-- Name: size_guides size_guides_category_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.size_guides
    ADD CONSTRAINT size_guides_category_id_key UNIQUE (category_id);


--
-- Name: size_guides size_guides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.size_guides
    ADD CONSTRAINT size_guides_pkey PRIMARY KEY (id);


--
-- Name: styles styles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.styles
    ADD CONSTRAINT styles_pkey PRIMARY KEY (id);


--
-- Name: styles styles_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.styles
    ADD CONSTRAINT styles_slug_key UNIQUE (slug);


--
-- Name: transactional_email_logs transactional_email_logs_event_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactional_email_logs
    ADD CONSTRAINT transactional_email_logs_event_key_key UNIQUE (event_key);


--
-- Name: transactional_email_logs transactional_email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactional_email_logs
    ADD CONSTRAINT transactional_email_logs_pkey PRIMARY KEY (id);


--
-- Name: product_inventory unique_product_color_size; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_inventory
    ADD CONSTRAINT unique_product_color_size UNIQUE (product_id, color_name, size_label);


--
-- Name: product_reviews unique_user_order_product_review; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT unique_user_order_product_review UNIQUE (user_id, order_id, product_id);


--
-- Name: user_addresses user_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_pkey PRIMARY KEY (id);


--
-- Name: user_favorites user_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: voucher_redemptions voucher_redemptions_order_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_redemptions
    ADD CONSTRAINT voucher_redemptions_order_unique UNIQUE (order_id);


--
-- Name: voucher_redemptions voucher_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_redemptions
    ADD CONSTRAINT voucher_redemptions_pkey PRIMARY KEY (id);


--
-- Name: vouchers vouchers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_code_key UNIQUE (code);


--
-- Name: vouchers vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_pkey PRIMARY KEY (id);


--
-- Name: idx_cart_items_cart_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_cart_id ON public.cart_items USING btree (cart_id);


--
-- Name: idx_cart_items_color_variant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_color_variant_id ON public.cart_items USING btree (color_variant_id);


--
-- Name: idx_cart_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_product_id ON public.cart_items USING btree (product_id);


--
-- Name: idx_cart_items_unique_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_cart_items_unique_variant ON public.cart_items USING btree (cart_id, product_id, COALESCE(size_label, ''::character varying), color_variant_id) WHERE (color_variant_id IS NOT NULL);


--
-- Name: idx_categories_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_deleted_at ON public.categories USING btree (deleted_at);


--
-- Name: idx_categories_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_department_id ON public.categories USING btree (department_id);


--
-- Name: idx_categories_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_status ON public.categories USING btree (status);


--
-- Name: idx_collection_departments_collection; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collection_departments_collection ON public.collection_departments USING btree (collection_id);


--
-- Name: idx_collection_departments_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collection_departments_department ON public.collection_departments USING btree (department_id, status) WHERE (deleted_at IS NULL);


--
-- Name: idx_collections_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collections_deleted_at ON public.collections USING btree (deleted_at);


--
-- Name: idx_collections_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collections_status ON public.collections USING btree (status);


--
-- Name: idx_fits_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fits_deleted_at ON public.fits USING btree (deleted_at);


--
-- Name: idx_fits_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fits_department_id ON public.fits USING btree (department_id);


--
-- Name: idx_fits_product_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fits_product_group_id ON public.fits USING btree (product_group_id);


--
-- Name: idx_fits_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fits_status ON public.fits USING btree (status);


--
-- Name: idx_inventory_logs_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_logs_product_id ON public.inventory_logs USING btree (product_id);


--
-- Name: idx_inventory_logs_variant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_logs_variant_id ON public.inventory_logs USING btree (variant_id);


--
-- Name: idx_materials_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materials_department_id ON public.materials USING btree (department_id);


--
-- Name: idx_materials_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materials_name ON public.materials USING btree (lower(TRIM(BOTH FROM name)));


--
-- Name: idx_materials_product_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materials_product_group_id ON public.materials USING btree (product_group_id);


--
-- Name: idx_materials_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materials_scope ON public.materials USING btree (product_group_id, department_id, status);


--
-- Name: idx_materials_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materials_status ON public.materials USING btree (status);


--
-- Name: idx_order_items_color_variant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_color_variant_id ON public.order_items USING btree (color_variant_id);


--
-- Name: idx_order_items_completed_product_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_completed_product_lookup ON public.order_items USING btree (product_id, product_name);


--
-- Name: idx_order_items_order_created_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order_created_id ON public.order_items USING btree (order_id, created_at, id);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_product_code_at_purchase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_product_code_at_purchase ON public.order_items USING btree (product_code_at_purchase) WHERE (product_code_at_purchase IS NOT NULL);


--
-- Name: idx_order_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);


--
-- Name: idx_order_items_variant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_variant_id ON public.order_items USING btree (variant_id);


--
-- Name: idx_order_status_history_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_status_history_order ON public.order_status_history USING btree (order_id);


--
-- Name: idx_order_status_history_order_created_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_status_history_order_created_id ON public.order_status_history USING btree (order_id, created_at, id);


--
-- Name: idx_orders_bank_transfer_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_bank_transfer_expiry ON public.orders USING btree (payment_expires_at) WHERE (((payment_method)::text = 'bank_transfer'::text) AND ((payment_status)::text = ANY ((ARRAY['pending_payment'::character varying, 'payment_failed'::character varying])::text[])) AND ((order_status)::text = 'pending'::text));


--
-- Name: idx_orders_bank_transfer_review; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_bank_transfer_review ON public.orders USING btree (payment_method, payment_status) WHERE ((payment_method)::text = 'bank_transfer'::text);


--
-- Name: idx_orders_cancelled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_cancelled_at ON public.orders USING btree (cancelled_at);


--
-- Name: idx_orders_completed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_completed_at ON public.orders USING btree (completed_at);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);


--
-- Name: idx_orders_delivered_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_delivered_at ON public.orders USING btree (delivered_at);


--
-- Name: idx_orders_payment_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_payment_method ON public.orders USING btree (payment_method);


--
-- Name: idx_orders_payment_reviewed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_payment_reviewed_by ON public.orders USING btree (payment_reviewed_by);


--
-- Name: idx_orders_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_payment_status ON public.orders USING btree (payment_status);


--
-- Name: idx_orders_payment_status_created_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_payment_status_created_id ON public.orders USING btree (payment_status, created_at DESC, id DESC);


--
-- Name: idx_orders_refunded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_refunded_at ON public.orders USING btree (refunded_at);


--
-- Name: idx_orders_returned_to_warehouse_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_returned_to_warehouse_at ON public.orders USING btree (returned_to_warehouse_at);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (order_status);


--
-- Name: idx_orders_status_created_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status_created_id ON public.orders USING btree (order_status, created_at DESC, id DESC);


--
-- Name: idx_orders_user_created_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_created_id ON public.orders USING btree (user_id, created_at DESC, id DESC);


--
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: idx_orders_user_phone_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_phone_created_at ON public.orders USING btree (user_id, shipping_phone, created_at DESC);


--
-- Name: idx_product_color_variants_color_family; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_color_variants_color_family ON public.product_color_variants USING btree (color_family) WHERE (deleted_at IS NULL);


--
-- Name: idx_product_color_variants_product_code_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_product_color_variants_product_code_active ON public.product_color_variants USING btree (lower(TRIM(BOTH FROM product_code))) WHERE ((deleted_at IS NULL) AND (product_code IS NOT NULL) AND (length(TRIM(BOTH FROM product_code)) > 0));


--
-- Name: idx_product_color_variants_product_color_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_product_color_variants_product_color_active ON public.product_color_variants USING btree (product_id, lower(TRIM(BOTH FROM color_name))) WHERE (deleted_at IS NULL);


--
-- Name: idx_product_color_variants_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_color_variants_product_id ON public.product_color_variants USING btree (product_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_product_color_variants_sale_price_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_color_variants_sale_price_active ON public.product_color_variants USING btree (sale_price) WHERE ((deleted_at IS NULL) AND (sale_price IS NOT NULL));


--
-- Name: idx_product_highlights_one_material_info; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_product_highlights_one_material_info ON public.product_highlights USING btree (product_id) WHERE ((highlight_type)::text = 'material_information'::text);


--
-- Name: idx_product_highlights_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_highlights_product_id ON public.product_highlights USING btree (product_id);


--
-- Name: idx_product_highlights_product_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_highlights_product_type ON public.product_highlights USING btree (product_id, highlight_type);


--
-- Name: idx_product_images_color_variant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_images_color_variant_id ON public.product_images USING btree (color_variant_id);


--
-- Name: idx_product_images_one_primary_per_color; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_product_images_one_primary_per_color ON public.product_images USING btree (product_id, color_name) WHERE (is_primary = true);


--
-- Name: idx_product_inventory_article_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_inventory_article_number ON public.product_inventory USING btree (lower(TRIM(BOTH FROM article_number))) WHERE ((article_number IS NOT NULL) AND (length(TRIM(BOTH FROM article_number)) > 0));


--
-- Name: idx_product_inventory_color_size; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_inventory_color_size ON public.product_inventory USING btree (product_id, color_name, size_label);


--
-- Name: idx_product_inventory_color_variant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_inventory_color_variant_id ON public.product_inventory USING btree (color_variant_id);


--
-- Name: idx_product_inventory_product_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_inventory_product_code ON public.product_inventory USING btree (lower(TRIM(BOTH FROM product_code))) WHERE ((product_code IS NOT NULL) AND (length(TRIM(BOTH FROM product_code)) > 0));


--
-- Name: idx_product_inventory_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_inventory_product_id ON public.product_inventory USING btree (product_id);


--
-- Name: idx_product_materials_material_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_materials_material_id ON public.product_materials USING btree (material_id);


--
-- Name: idx_product_materials_material_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_materials_material_name ON public.product_materials USING btree (lower(TRIM(BOTH FROM material_name)));


--
-- Name: idx_product_materials_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_materials_product_id ON public.product_materials USING btree (product_id);


--
-- Name: idx_product_reviews_admin_reply_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_admin_reply_by ON public.product_reviews USING btree (admin_reply_by) WHERE (admin_reply_by IS NOT NULL);


--
-- Name: idx_product_reviews_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_order_id ON public.product_reviews USING btree (order_id);


--
-- Name: idx_products_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_created_at ON public.products USING btree (created_at);


--
-- Name: idx_products_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_deleted_at ON public.products USING btree (deleted_at);


--
-- Name: idx_products_fit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_fit_id ON public.products USING btree (fit_id);


--
-- Name: idx_products_pricing_mode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_pricing_mode ON public.products USING btree (pricing_mode);


--
-- Name: idx_products_sold_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_sold_count ON public.products USING btree (sold_count DESC);


--
-- Name: idx_products_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_status ON public.products USING btree (status);


--
-- Name: idx_refunds_account_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refunds_account_status ON public.refunds USING btree (refund_account_status, updated_at DESC);


--
-- Name: idx_refunds_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refunds_order ON public.refunds USING btree (order_id, created_at DESC);


--
-- Name: idx_refunds_return_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refunds_return_request ON public.refunds USING btree (return_request_id) WHERE (return_request_id IS NOT NULL);


--
-- Name: idx_refunds_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refunds_status ON public.refunds USING btree (status, created_at);


--
-- Name: idx_refunds_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refunds_user ON public.refunds USING btree (user_id, created_at DESC);


--
-- Name: idx_return_items_order_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_return_items_order_item ON public.return_items USING btree (order_item_id);


--
-- Name: idx_return_items_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_return_items_request ON public.return_items USING btree (return_request_id);


--
-- Name: idx_return_requests_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_return_requests_order ON public.return_requests USING btree (order_id);


--
-- Name: idx_return_requests_order_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_return_requests_order_created ON public.return_requests USING btree (order_id, created_at DESC);


--
-- Name: idx_return_requests_order_created_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_return_requests_order_created_id ON public.return_requests USING btree (order_id, created_at DESC, id DESC);


--
-- Name: idx_return_requests_refund_account_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_return_requests_refund_account_status ON public.return_requests USING btree (refund_account_status, updated_at DESC);


--
-- Name: idx_return_requests_requested_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_return_requests_requested_at ON public.return_requests USING btree (requested_at);


--
-- Name: idx_return_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_return_requests_status ON public.return_requests USING btree (return_status);


--
-- Name: idx_return_requests_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_return_requests_user ON public.return_requests USING btree (user_id);


--
-- Name: idx_styles_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_styles_category_id ON public.styles USING btree (category_id);


--
-- Name: idx_styles_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_styles_department_id ON public.styles USING btree (department_id);


--
-- Name: idx_styles_product_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_styles_product_group_id ON public.styles USING btree (product_group_id);


--
-- Name: idx_styles_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_styles_scope ON public.styles USING btree (product_group_id, department_id, category_id, status);


--
-- Name: idx_styles_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_styles_status ON public.styles USING btree (status);


--
-- Name: idx_transactional_email_logs_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactional_email_logs_recipient ON public.transactional_email_logs USING btree (recipient_email, created_at DESC);


--
-- Name: idx_transactional_email_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactional_email_logs_status ON public.transactional_email_logs USING btree (status, created_at DESC);


--
-- Name: idx_user_favorites_color_variant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_favorites_color_variant_id ON public.user_favorites USING btree (color_variant_id);


--
-- Name: idx_user_favorites_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_favorites_product_id ON public.user_favorites USING btree (product_id);


--
-- Name: idx_user_favorites_unique_product_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_user_favorites_unique_product_variant ON public.user_favorites USING btree (user_id, product_id, color_variant_id);


--
-- Name: idx_user_favorites_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_favorites_user_id ON public.user_favorites USING btree (user_id);


--
-- Name: idx_users_pending_email_verification; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_pending_email_verification ON public.users USING btree (email_verification_expires_at) WHERE (email_verified = false);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: idx_voucher_redemptions_user_voucher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voucher_redemptions_user_voucher ON public.voucher_redemptions USING btree (user_id, voucher_id, created_at DESC);


--
-- Name: idx_vouchers_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vouchers_deleted_at ON public.vouchers USING btree (deleted_at);


--
-- Name: idx_vouchers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vouchers_status ON public.vouchers USING btree (status);


--
-- Name: one_default_address_per_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX one_default_address_per_user ON public.user_addresses USING btree (user_id) WHERE (is_default = true);


--
-- Name: uq_return_requests_return_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_return_requests_return_code ON public.return_requests USING btree (return_code);


--
-- Name: order_items order_items_sync_product_sold_count_after_write; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER order_items_sync_product_sold_count_after_write AFTER INSERT OR DELETE OR UPDATE OF product_id, order_id, quantity, refunded_quantity ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.sync_product_sold_count_from_order_item();


--
-- Name: orders orders_sync_product_sold_count_after_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER orders_sync_product_sold_count_after_status AFTER UPDATE OF order_status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.sync_product_sold_count_from_order_status();


--
-- Name: products products_apply_pricing_contract_before_write; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER products_apply_pricing_contract_before_write BEFORE INSERT OR UPDATE OF pricing_mode, price, original_price, sale_price, is_sale ON public.products FOR EACH ROW EXECUTE FUNCTION public.products_apply_pricing_contract();


--
-- Name: products products_set_derived_sold_count_before_write; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER products_set_derived_sold_count_before_write BEFORE INSERT OR UPDATE OF sold_count ON public.products FOR EACH ROW EXECUTE FUNCTION public.products_set_derived_sold_count();


--
-- Name: user_addresses update_user_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_addresses_updated_at BEFORE UPDATE ON public.user_addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_profiles update_user_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cart_items cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: carts carts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: categories categories_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: categories categories_product_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_product_group_id_fkey FOREIGN KEY (product_group_id) REFERENCES public.product_groups(id) ON DELETE SET NULL;


--
-- Name: collection_departments collection_departments_collection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_departments
    ADD CONSTRAINT collection_departments_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE;


--
-- Name: collection_departments collection_departments_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_departments
    ADD CONSTRAINT collection_departments_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: fits fits_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fits
    ADD CONSTRAINT fits_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: fits fits_product_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fits
    ADD CONSTRAINT fits_product_group_id_fkey FOREIGN KEY (product_group_id) REFERENCES public.product_groups(id) ON DELETE SET NULL;


--
-- Name: cart_items fk_cart_items_color_variant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT fk_cart_items_color_variant FOREIGN KEY (color_variant_id) REFERENCES public.product_color_variants(id) ON DELETE SET NULL;


--
-- Name: user_favorites fk_favorites_color_variant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT fk_favorites_color_variant FOREIGN KEY (color_variant_id) REFERENCES public.product_color_variants(id) ON DELETE CASCADE;


--
-- Name: inventory_logs fk_inventory_logs_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_logs
    ADD CONSTRAINT fk_inventory_logs_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: inventory_logs fk_inventory_logs_variant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_logs
    ADD CONSTRAINT fk_inventory_logs_variant FOREIGN KEY (variant_id) REFERENCES public.product_inventory(id) ON DELETE SET NULL;


--
-- Name: product_inventory fk_inventory_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_inventory
    ADD CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: order_items fk_order_items_color_variant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fk_order_items_color_variant FOREIGN KEY (color_variant_id) REFERENCES public.product_color_variants(id) ON DELETE SET NULL;


--
-- Name: order_items fk_order_items_order; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items fk_order_items_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: order_items fk_order_items_variant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fk_order_items_variant FOREIGN KEY (variant_id) REFERENCES public.product_inventory(id) ON DELETE RESTRICT;


--
-- Name: order_status_history fk_order_status_history_order; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT fk_order_status_history_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders fk_orders_payment_reviewed_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fk_orders_payment_reviewed_by FOREIGN KEY (payment_reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: orders fk_orders_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: product_color_variants fk_product_color_variants_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_color_variants
    ADD CONSTRAINT fk_product_color_variants_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_images fk_product_images_color_variant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT fk_product_images_color_variant FOREIGN KEY (color_variant_id) REFERENCES public.product_color_variants(id) ON DELETE SET NULL;


--
-- Name: product_inventory fk_product_inventory_color_variant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_inventory
    ADD CONSTRAINT fk_product_inventory_color_variant FOREIGN KEY (color_variant_id) REFERENCES public.product_color_variants(id) ON DELETE SET NULL;


--
-- Name: product_materials fk_product_materials_material; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_materials
    ADD CONSTRAINT fk_product_materials_material FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE SET NULL;


--
-- Name: products fk_products_category; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: products fk_products_collection; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_products_collection FOREIGN KEY (collection_id) REFERENCES public.collections(id);


--
-- Name: products fk_products_department; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_products_department FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: products fk_products_style; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_products_style FOREIGN KEY (style_id) REFERENCES public.styles(id);


--
-- Name: return_requests fk_return_requests_order; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_requests
    ADD CONSTRAINT fk_return_requests_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: return_requests fk_return_requests_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_requests
    ADD CONSTRAINT fk_return_requests_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: product_reviews fk_review_admin_reply_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT fk_review_admin_reply_by FOREIGN KEY (admin_reply_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: product_reviews fk_review_order; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT fk_review_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: product_reviews fk_review_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT fk_review_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_reviews fk_review_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: search_history fk_search_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_history
    ADD CONSTRAINT fk_search_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: materials materials_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: materials materials_product_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_product_group_id_fkey FOREIGN KEY (product_group_id) REFERENCES public.product_groups(id) ON DELETE SET NULL;


--
-- Name: product_highlights product_highlights_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_highlights
    ADD CONSTRAINT product_highlights_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_materials product_materials_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_materials
    ADD CONSTRAINT product_materials_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE SET NULL;


--
-- Name: product_materials product_materials_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_materials
    ADD CONSTRAINT product_materials_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_fit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_fit_id_fkey FOREIGN KEY (fit_id) REFERENCES public.fits(id) ON DELETE SET NULL;


--
-- Name: products products_product_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_product_group_id_fkey FOREIGN KEY (product_group_id) REFERENCES public.product_groups(id) ON DELETE SET NULL;


--
-- Name: refunds refunds_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: refunds refunds_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE RESTRICT;


--
-- Name: refunds refunds_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: refunds refunds_return_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_return_request_id_fkey FOREIGN KEY (return_request_id) REFERENCES public.return_requests(id) ON DELETE RESTRICT;


--
-- Name: refunds refunds_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: return_items return_items_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_items
    ADD CONSTRAINT return_items_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE RESTRICT;


--
-- Name: return_items return_items_return_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_items
    ADD CONSTRAINT return_items_return_request_id_fkey FOREIGN KEY (return_request_id) REFERENCES public.return_requests(id) ON DELETE CASCADE;


--
-- Name: return_requests return_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_requests
    ADD CONSTRAINT return_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: return_requests return_requests_inspected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_requests
    ADD CONSTRAINT return_requests_inspected_by_fkey FOREIGN KEY (inspected_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: return_requests return_requests_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_requests
    ADD CONSTRAINT return_requests_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: return_requests return_requests_refund_account_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_requests
    ADD CONSTRAINT return_requests_refund_account_verified_by_fkey FOREIGN KEY (refund_account_verified_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: size_guides size_guides_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.size_guides
    ADD CONSTRAINT size_guides_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: styles styles_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.styles
    ADD CONSTRAINT styles_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: styles styles_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.styles
    ADD CONSTRAINT styles_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: styles styles_product_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.styles
    ADD CONSTRAINT styles_product_group_id_fkey FOREIGN KEY (product_group_id) REFERENCES public.product_groups(id) ON DELETE SET NULL;


--
-- Name: user_addresses user_addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_favorites user_favorites_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: user_favorites user_favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorites
    ADD CONSTRAINT user_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: voucher_redemptions voucher_redemptions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_redemptions
    ADD CONSTRAINT voucher_redemptions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: voucher_redemptions voucher_redemptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_redemptions
    ADD CONSTRAINT voucher_redemptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: voucher_redemptions voucher_redemptions_voucher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_redemptions
    ADD CONSTRAINT voucher_redemptions_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES public.vouchers(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict EVC2r3Xgaz88juVfhbPQQB2BKGs0oChUeZ67PHe27jvFeERiOxF1QNgigByrc3W
