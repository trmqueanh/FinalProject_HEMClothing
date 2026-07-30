const { selectedPricingSql } = require('../utils/pricingResolver');

const CART_TABLE = 'carts';
const CART_ITEM_TABLE = 'cart_items';
const CATEGORY_TABLE = 'categories';
const COLLECTION_TABLE = 'collections';
const PRODUCT_COLOR_VARIANT_TABLE = 'product_color_variants';
const PRODUCT_IMAGE_TABLE = 'product_images';
const PRODUCT_INVENTORY_TABLE = 'product_inventory';
const PRODUCT_TABLE = 'products';
const STYLE_TABLE = 'styles';

const selectedColorPricingSql = selectedPricingSql({
  productAlias: 'p',
  variantAlias: 'price_variant'
});

const ensureUserCart = async (db, userId, { touch = false } = {}) => {
  const result = await db.query(
    `
      INSERT INTO ${CART_TABLE} (user_id, created_at, updated_at)
      VALUES ($1, now(), now())
      ON CONFLICT (user_id) DO UPDATE
      SET ${touch ? 'updated_at = now()' : 'user_id = EXCLUDED.user_id'}
      RETURNING id
    `,
    [userId]
  );

  return result.rows[0];
};

const findMatchingItemForUpdate = async (db, {
  cartId,
  productId,
  sizeLabel,
  colorName
}) => {
  const result = await db.query(
    `
      SELECT id, quantity
      FROM ${CART_ITEM_TABLE}
      WHERE cart_id = $1
        AND product_id = $2
        AND COALESCE(size_label, '') = COALESCE($3, '')
        AND COALESCE(color_name, '') = COALESCE($4, '')
      LIMIT 1
      FOR UPDATE
    `,
    [cartId, productId, sizeLabel, colorName]
  );
  return result.rows[0] || null;
};

const updateMatchingItem = (db, { id, quantity, colorVariantId }) => db.query(
  `
    UPDATE ${CART_ITEM_TABLE}
    SET quantity = $2,
        color_variant_id = COALESCE(color_variant_id, $3),
        updated_at = now()
    WHERE id = $1
  `,
  [id, quantity, colorVariantId || null]
);

const insertMatchingItem = (db, {
  cartId,
  productId,
  quantity,
  sizeLabel,
  colorName,
  colorVariantId
}) => db.query(
  `
    INSERT INTO ${CART_ITEM_TABLE} (
      cart_id, product_id, quantity, size_label, color_name,
      color_variant_id, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, now(), now())
  `,
  [cartId, productId, quantity, sizeLabel, colorName, colorVariantId || null]
);

const touch = (db, cartId) => db.query(
  `UPDATE ${CART_TABLE} SET updated_at = now() WHERE id = $1`,
  [cartId]
);

const fetchRows = async (db, userId) => {
  const result = await db.query(
    `
      SELECT
        cart.id AS cart_id,
        ci.id AS cart_item_id,
        ci.product_id,
        ci.quantity,
        ci.size_label,
        ci.color_name,
        COALESCE(ci.color_variant_id, inventory.color_variant_id) AS color_variant_id,
        inventory.product_code,
        inventory.article_number,
        p.name,
        c.name AS category_name,
        col.name AS collection_name,
        st.name AS style_name,
        ${selectedColorPricingSql.effectivePrice} AS price,
        ${selectedColorPricingSql.comparePrice} AS original_price,
        ${selectedColorPricingSql.pricingMode} AS pricing_mode,
        ${selectedColorPricingSql.priceSource} AS price_source,
        p.slug,
        inventory.available_inventory,
        product_image.image_url
      FROM ${CART_TABLE} cart
      LEFT JOIN ${CART_ITEM_TABLE} ci ON ci.cart_id = cart.id
      LEFT JOIN ${PRODUCT_TABLE} p ON p.id = ci.product_id
      LEFT JOIN ${CATEGORY_TABLE} c ON c.id = p.category_id
      LEFT JOIN ${COLLECTION_TABLE} col ON col.id = p.collection_id
      LEFT JOIN ${STYLE_TABLE} st ON st.id = p.style_id
      LEFT JOIN LATERAL (
        SELECT pi.image_url
        FROM ${PRODUCT_IMAGE_TABLE} pi
        WHERE pi.product_id = p.id
          AND (
            (
              ci.color_variant_id IS NOT NULL
              AND pi.color_variant_id = ci.color_variant_id
            )
            OR (
              NULLIF(TRIM(COALESCE(ci.color_name, '')), '') IS NOT NULL
              AND LOWER(TRIM(COALESCE(pi.color_name, ''))) = LOWER(TRIM(COALESCE(ci.color_name, '')))
            )
            OR pi.is_primary = true
            OR COALESCE(pi.color_name, '') = ''
          )
        ORDER BY
          CASE
            WHEN ci.color_variant_id IS NOT NULL
              AND pi.color_variant_id = ci.color_variant_id THEN 0
            WHEN NULLIF(TRIM(COALESCE(ci.color_name, '')), '') IS NOT NULL
              AND LOWER(TRIM(COALESCE(pi.color_name, ''))) = LOWER(TRIM(COALESCE(ci.color_name, ''))) THEN 1
            WHEN pi.is_primary = true THEN 2
            WHEN COALESCE(pi.color_name, '') = '' THEN 3
            ELSE 4
          END,
          pi.is_primary DESC,
          pi.sort_order ASC,
          pi.created_at ASC,
          pi.id ASC
        LIMIT 1
      ) product_image ON true
      LEFT JOIN LATERAL (
        SELECT
          pi.color_variant_id,
          pi.product_code,
          pi.article_number,
          GREATEST(
            pi.stock_quantity - COALESCE((to_jsonb(pi)->>'reserved_quantity')::int, 0),
            0
          ) AS available_inventory
        FROM ${PRODUCT_INVENTORY_TABLE} pi
        WHERE pi.product_id = p.id
          AND COALESCE(pi.size_label, '') = COALESCE(ci.size_label, '')
          AND (
            (
              ci.color_variant_id IS NOT NULL
              AND pi.color_variant_id = ci.color_variant_id
            )
            OR COALESCE(pi.color_name, '') = COALESCE(ci.color_name, '')
          )
        ORDER BY
          CASE
            WHEN ci.color_variant_id IS NOT NULL
              AND pi.color_variant_id = ci.color_variant_id THEN 0
            WHEN COALESCE(pi.color_name, '') = COALESCE(ci.color_name, '') THEN 1
            ELSE 2
          END
        LIMIT 1
      ) inventory ON true
      LEFT JOIN ${PRODUCT_COLOR_VARIANT_TABLE} price_variant
        ON price_variant.id = COALESCE(ci.color_variant_id, inventory.color_variant_id)
       AND price_variant.deleted_at IS NULL
      WHERE cart.user_id = $1
      ORDER BY ci.created_at DESC, ci.id DESC
    `,
    [userId]
  );

  return result.rows;
};

const findProductContext = async (db, { productId, sizeLabel, colorName, colorVariantId }) => {
  const result = await db.query(
    `
      SELECT
        p.id AS product_id,
        EXISTS(
          SELECT 1
          FROM ${PRODUCT_INVENTORY_TABLE} pi_any
          WHERE pi_any.product_id = p.id
        ) AS has_variants,
        variant.color_variant_id,
        variant.color_name,
        GREATEST(
          COALESCE(variant.stock_quantity, 0) - COALESCE(variant.reserved_quantity, 0),
          0
        )::int AS available_inventory
      FROM ${PRODUCT_TABLE} p
      LEFT JOIN LATERAL (
        SELECT
          pi.color_variant_id,
          pi.color_name,
          pi.stock_quantity,
          COALESCE((to_jsonb(pi)->>'reserved_quantity')::int, 0) AS reserved_quantity
        FROM ${PRODUCT_INVENTORY_TABLE} pi
        WHERE pi.product_id = p.id
          AND COALESCE(pi.size_label, '') = COALESCE($2, '')
          AND (
            ($4::uuid IS NOT NULL AND pi.color_variant_id = $4::uuid)
            OR COALESCE(pi.color_name, '') = COALESCE($3, '')
          )
        ORDER BY
          CASE
            WHEN $4::uuid IS NOT NULL AND pi.color_variant_id = $4::uuid THEN 0
            WHEN COALESCE(pi.color_name, '') = COALESCE($3, '') THEN 1
            ELSE 2
          END
        LIMIT 1
      ) variant ON true
      WHERE p.id = $1
        AND COALESCE(p.status, 'active') = 'active'
        AND (to_jsonb(p)->>'deleted_at') IS NULL
      LIMIT 1
    `,
    [productId, sizeLabel, colorName, colorVariantId || null]
  );

  return result.rows[0] || null;
};

const addItem = async (db, userId, payload) => {
  const mutationResult = await db.query(
    `
      WITH user_cart AS (
        INSERT INTO ${CART_TABLE} (user_id, created_at, updated_at)
        VALUES ($1, now(), now())
        ON CONFLICT (user_id) DO UPDATE
        SET updated_at = now()
        RETURNING id
      ),
      product_context AS (
        SELECT
          p.id AS product_id,
          variant.color_variant_id,
          variant.color_name,
          GREATEST(
            COALESCE(variant.stock_quantity, 0) - COALESCE(variant.reserved_quantity, 0),
            0
          )::int AS available_inventory
        FROM ${PRODUCT_TABLE} p
        LEFT JOIN LATERAL (
          SELECT
            pi.color_variant_id,
            pi.color_name,
            pi.stock_quantity,
            COALESCE((to_jsonb(pi)->>'reserved_quantity')::int, 0) AS reserved_quantity
          FROM ${PRODUCT_INVENTORY_TABLE} pi
          WHERE pi.product_id = p.id
            AND COALESCE(pi.size_label, '') = COALESCE($4, '')
            AND (
              ($6::uuid IS NOT NULL AND pi.color_variant_id = $6::uuid)
              OR COALESCE(pi.color_name, '') = COALESCE($5, '')
            )
          ORDER BY
            CASE
              WHEN $6::uuid IS NOT NULL AND pi.color_variant_id = $6::uuid THEN 0
              WHEN COALESCE(pi.color_name, '') = COALESCE($5, '') THEN 1
              ELSE 2
            END
          LIMIT 1
        ) variant ON true
        WHERE p.id = $2
          AND COALESCE(p.status, 'active') = 'active'
          AND (to_jsonb(p)->>'deleted_at') IS NULL
        LIMIT 1
      ),
      changed_item AS (
        INSERT INTO ${CART_ITEM_TABLE} (
          cart_id,
          product_id,
          quantity,
          size_label,
          color_name,
          color_variant_id,
          created_at,
          updated_at
        )
        SELECT
          user_cart.id,
          product_context.product_id,
          $3,
          $4,
          product_context.color_name,
          product_context.color_variant_id,
          now(),
          now()
        FROM user_cart
        CROSS JOIN product_context
        WHERE product_context.color_variant_id IS NOT NULL
          AND product_context.available_inventory > 0
          AND $3 <= product_context.available_inventory
        ON CONFLICT (
          cart_id,
          product_id,
          (COALESCE(size_label, '')),
          color_variant_id
        ) WHERE color_variant_id IS NOT NULL
        DO UPDATE
        SET quantity = ${CART_ITEM_TABLE}.quantity + EXCLUDED.quantity,
            color_name = EXCLUDED.color_name,
            updated_at = now()
        WHERE ${CART_ITEM_TABLE}.quantity + EXCLUDED.quantity <= (
          SELECT available_inventory
          FROM product_context
        )
        RETURNING id
      )
      SELECT
        EXISTS(SELECT 1 FROM product_context) AS product_exists,
        COALESCE(
          (SELECT available_inventory FROM product_context),
          0
        )::int AS available_inventory,
        EXISTS(SELECT 1 FROM changed_item) AS changed
    `,
    [
      userId,
      payload.productId,
      payload.quantity,
      payload.sizeLabel,
      payload.colorName,
      payload.colorVariantId || null
    ]
  );
  const mutation = mutationResult.rows[0] || {};
  const productExists = Boolean(mutation.product_exists);
  const availableInventory = Number(mutation.available_inventory || 0);
  const changed = Boolean(mutation.changed);

  if (!changed) {
    return { productExists, availableInventory, changed: false, rows: [] };
  }

  const rows = await fetchRows(db, userId);
  return { productExists, availableInventory, changed: true, rows };
};

const findOwnedItem = async (db, userId, cartItemId) => {
  const result = await db.query(
    `
      SELECT
        ci.id,
        ci.cart_id,
        ci.product_id,
        ci.size_label,
        ci.color_name,
        ci.color_variant_id
      FROM ${CART_ITEM_TABLE} ci
      JOIN ${CART_TABLE} cart ON cart.id = ci.cart_id
      WHERE ci.id = $1
        AND cart.user_id = $2
      LIMIT 1
      FOR UPDATE OF ci
    `,
    [cartItemId, userId]
  );

  return result.rows[0] || null;
};

const updateItem = async (db, userId, cartItemId, quantity) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    const item = await findOwnedItem(client, userId, cartItemId);

    if (!item) {
      await client.query('COMMIT');
      return { itemExists: false, availableInventory: 0, changed: false, rows: [] };
    }

    let availableInventory = 0;
    let changed = false;

    if (quantity <= 0) {
      await client.query(`DELETE FROM ${CART_ITEM_TABLE} WHERE id = $1`, [item.id]);
      changed = true;
    } else {
      const context = await findProductContext(client, {
        productId: item.product_id,
        sizeLabel: item.size_label,
        colorName: item.color_name,
        colorVariantId: item.color_variant_id
      });
      availableInventory = Number(context && context.available_inventory || 0);

      if (context && context.has_variants && quantity <= availableInventory) {
        await client.query(
          `
            UPDATE ${CART_ITEM_TABLE}
            SET quantity = $2,
                updated_at = now()
            WHERE id = $1
          `,
          [item.id, quantity]
        );
        changed = true;
      }
    }

    if (!changed) {
      await client.query('COMMIT');
      return { itemExists: true, availableInventory, changed: false, rows: [] };
    }

    await client.query(
      `UPDATE ${CART_TABLE} SET updated_at = now() WHERE id = $1`,
      [item.cart_id]
    );
    const rows = await fetchRows(client, userId);
    await client.query('COMMIT');
    return { itemExists: true, availableInventory, changed: true, rows };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const removeItem = async (db, userId, cartItemId) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    const item = await findOwnedItem(client, userId, cartItemId);

    if (!item) {
      await client.query('COMMIT');
      return { removed: false, rows: [] };
    }

    await client.query(`DELETE FROM ${CART_ITEM_TABLE} WHERE id = $1`, [item.id]);
    await client.query(
      `UPDATE ${CART_TABLE} SET updated_at = now() WHERE id = $1`,
      [item.cart_id]
    );
    const rows = await fetchRows(client, userId);
    await client.query('COMMIT');
    return { removed: true, rows };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const clear = async (db, userId) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    const cart = await ensureUserCart(client, userId);
    await client.query(`DELETE FROM ${CART_ITEM_TABLE} WHERE cart_id = $1`, [cart.id]);
    await client.query(
      `UPDATE ${CART_TABLE} SET updated_at = now() WHERE id = $1`,
      [cart.id]
    );
    await client.query('COMMIT');
    return cart;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  addItem,
  clear,
  ensureUserCart,
  fetchRows,
  findMatchingItemForUpdate,
  insertMatchingItem,
  removeItem,
  touch,
  updateMatchingItem,
  updateItem
};
