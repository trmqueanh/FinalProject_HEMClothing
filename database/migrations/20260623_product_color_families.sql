-- Group detailed product color names into customer-facing filter families.

BEGIN;

ALTER TABLE IF EXISTS product_color_variants
    ADD COLUMN IF NOT EXISTS color_family VARCHAR(40);

WITH normalized AS (
    SELECT
        id,
        LOWER(REGEXP_REPLACE(
            REGEXP_REPLACE(
                REGEXP_REPLACE(TRIM(SPLIT_PART(COALESCE(color_name, ''), '/', 1)), '[_-]+', ' ', 'g'),
                '\m(striped|floral|checked|printed|pattern)\M',
                ' ',
                'gi'
            ),
            '\s+',
            ' ',
            'g'
        )) AS family_source
    FROM product_color_variants
)
UPDATE product_color_variants pcv
SET color_family = CASE
        WHEN normalized.family_source = '' OR normalized.family_source ~* '\mmulti\M' THEN 'Multi'
        WHEN normalized.family_source ~* '\m(black|ink)\M' THEN 'Black'
        WHEN normalized.family_source ~* '\m(white|off white|ivory)\M' THEN 'White'
        WHEN normalized.family_source ~* '\m(gray|grey|silver|charcoal|graphite)\M' THEN 'Gray'
        WHEN normalized.family_source ~* '\m(green|teal|olive|sage|mint|moss)\M' THEN 'Green'
        WHEN normalized.family_source ~* '\m(blue|navy|denim|midnight|indigo|cobalt|turquoise)\M' THEN 'Blue'
        WHEN normalized.family_source ~* '\m(red|burgundy|wine)\M' THEN 'Red'
        WHEN normalized.family_source ~* '\m(pink|blush|rose|mauve)\M' THEN 'Pink'
        WHEN normalized.family_source ~* '\m(purple|plum|lavender|lilac)\M' THEN 'Purple'
        WHEN normalized.family_source ~* '\m(yellow|gold|mustard)\M' THEN 'Yellow'
        WHEN normalized.family_source ~* '\m(orange|rust|coral)\M' THEN 'Orange'
        WHEN normalized.family_source ~* '\m(brown|espresso|chocolate)\M' THEN 'Brown'
        WHEN normalized.family_source ~* '\m(beige|cream|ecru|natural|stone|sand|oat|taupe|khaki|tan|camel)\M' THEN 'Beige'
        ELSE 'Multi'
    END,
    updated_at = now()
FROM normalized
WHERE pcv.id = normalized.id
  AND (pcv.color_family IS NULL OR TRIM(pcv.color_family) = '');

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_product_color_variants_color_family_allowed'
          AND conrelid = 'product_color_variants'::regclass
    ) THEN
        ALTER TABLE product_color_variants
            ADD CONSTRAINT chk_product_color_variants_color_family_allowed
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
            );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_color_variants_color_family
    ON product_color_variants(color_family)
    WHERE deleted_at IS NULL;

COMMENT ON COLUMN product_color_variants.color_family IS
    'Customer-friendly color family used for storefront color filters while preserving exact color_name.';

COMMIT;
