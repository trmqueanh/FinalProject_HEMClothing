-- Convert existing USD-style monetary data to VND.
-- Product, order item, order subtotal/discount/total, and fixed voucher amounts
-- use 1 USD = 25,000 VND. Non-free historical shipping is normalized to 30,000 VND.

CREATE TABLE IF NOT EXISTS currency_conversion_log (
    migration_name VARCHAR(120) PRIMARY KEY,
    converted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

DO $$
DECLARE
    conversion_rate NUMERIC := 25000;
    standard_shipping_fee NUMERIC := 30000;
    migration_key TEXT := '20260613_convert_prices_to_vnd';
BEGIN
    IF EXISTS (
        SELECT 1
        FROM currency_conversion_log
        WHERE migration_name = migration_key
    ) THEN
        RAISE NOTICE 'Currency migration % already applied.', migration_key;
        RETURN;
    END IF;

    UPDATE products
    SET
        price = ROUND(price * conversion_rate, 2),
        original_price = ROUND(original_price * conversion_rate, 2),
        sale_price = CASE
            WHEN sale_price IS NULL THEN NULL
            ELSE ROUND(sale_price * conversion_rate, 2)
        END,
        updated_at = now();

    UPDATE order_items
    SET
        product_price = ROUND(product_price * conversion_rate, 2),
        price_at_purchase = ROUND(COALESCE(NULLIF(price_at_purchase, 0), product_price) * conversion_rate, 2),
        original_price_at_purchase = ROUND(COALESCE(NULLIF(original_price_at_purchase, 0), product_price) * conversion_rate, 2);

    UPDATE orders
    SET
        subtotal = ROUND(subtotal * conversion_rate, 2),
        shipping_fee = CASE
            WHEN shipping_fee > 0 THEN standard_shipping_fee
            ELSE 0
        END,
        discount_amount = ROUND(discount_amount * conversion_rate, 2),
        total_amount = GREATEST(
            0,
            ROUND(subtotal * conversion_rate, 2)
            + CASE WHEN shipping_fee > 0 THEN standard_shipping_fee ELSE 0 END
            - ROUND(discount_amount * conversion_rate, 2)
        ),
        updated_at = now();

    UPDATE vouchers
    SET
        discount_value = CASE
            WHEN discount_type = 'fixed' THEN ROUND(discount_value * conversion_rate, 2)
            ELSE discount_value
        END,
        min_order_amount = ROUND(COALESCE(min_order_amount, 0) * conversion_rate, 2),
        max_discount_amount = CASE
            WHEN max_discount_amount IS NULL THEN NULL
            ELSE ROUND(max_discount_amount * conversion_rate, 2)
        END,
        updated_at = now();

    INSERT INTO currency_conversion_log (migration_name)
    VALUES (migration_key);
END $$;
