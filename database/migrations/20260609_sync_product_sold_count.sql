BEGIN;

-- order_items from completed orders are the source of truth for product sales.
UPDATE products p
SET sold_count = COALESCE((
      SELECT SUM(oi.quantity)::int
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id = p.id
        AND o.order_status = 'completed'
    ), 0),
    updated_at = now();

CREATE OR REPLACE FUNCTION public.calculate_product_sold_count(target_product_id uuid)
RETURNS integer AS $$
  SELECT COALESCE(SUM(oi.quantity), 0)::int
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
AFTER INSERT OR DELETE OR UPDATE OF product_id, order_id, quantity
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

COMMIT;
