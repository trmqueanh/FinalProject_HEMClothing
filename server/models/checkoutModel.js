const { selectedPricingSql } = require('../utils/pricingResolver');
const { PAYMENT_METHOD, PAYMENT_STATUS, ORDER_STATUS, USER_ROLE } = require('../constants/domainConstants');
const { allocateOrderDiscount, roundMoney } = require('../services/refundService');

const CART_ITEM_TABLE = 'cart_items';
const CART_TABLE = 'carts';
const CATEGORY_TABLE = 'categories';
const DEPARTMENT_TABLE = 'departments';
const INVENTORY_LOG_TABLE = 'inventory_logs';
const ORDER_ITEM_TABLE = 'order_items';
const ORDER_STATUS_HISTORY_TABLE = 'order_status_history';
const ORDER_TABLE = 'orders';
const PRODUCT_COLOR_VARIANT_TABLE = 'product_color_variants';
const PRODUCT_IMAGE_TABLE = 'product_images';
const PRODUCT_INVENTORY_TABLE = 'product_inventory';
const PRODUCT_TABLE = 'products';
const USER_PROFILE_TABLE = 'user_profiles';

const SELECTED_COLOR_PRICING_SQL = selectedPricingSql({
  productAlias: 'p',
  variantAlias: 'price_variant'
});

const probeSchemaCapabilities = async db => {
  const result = await db.query(
    `
      WITH column_flags AS (
        SELECT
          COALESCE(BOOL_OR(table_name = $1 AND column_name = 'variant_id'), false) AS has_order_item_variant_id,
          COALESCE(BOOL_OR(table_name = $1 AND column_name = 'price_at_purchase'), false) AS has_order_item_price_at_purchase,
          COALESCE(BOOL_OR(table_name = $1 AND column_name = 'original_price_at_purchase'), false) AS has_order_item_original_price_at_purchase,
          COALESCE(BOOL_OR(table_name = $1 AND column_name = 'pricing_mode_at_purchase'), false) AS has_order_item_pricing_mode_at_purchase,
          COALESCE(BOOL_OR(table_name = $1 AND column_name = 'color_variant_id'), false) AS has_order_item_color_variant_id,
          COALESCE(BOOL_OR(table_name = $1 AND column_name = 'product_code_at_purchase'), false) AS has_order_item_product_code_at_purchase,
          COALESCE(BOOL_OR(table_name = $1 AND column_name = 'article_number_at_purchase'), false) AS has_order_item_article_number_at_purchase,
          COALESCE(BOOL_OR(table_name = $1 AND column_name = 'reserved_quantity'), false) AS has_order_item_reserved_quantity,
          COALESCE(BOOL_OR(table_name = $2 AND column_name = 'reserved_quantity'), false) AS has_inventory_reserved_quantity
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND (
            (table_name = $1 AND column_name = ANY($3::text[]))
            OR (table_name = $2 AND column_name = 'reserved_quantity')
          )
      ),
      table_flags AS (
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = $4
        ) AS has_inventory_logs
      )
      SELECT column_flags.*, table_flags.has_inventory_logs
      FROM column_flags
      CROSS JOIN table_flags
    `,
    [
      ORDER_ITEM_TABLE,
      PRODUCT_INVENTORY_TABLE,
      [
        'variant_id',
        'price_at_purchase',
        'original_price_at_purchase',
        'pricing_mode_at_purchase',
        'color_variant_id',
        'product_code_at_purchase',
        'article_number_at_purchase',
        'reserved_quantity'
      ],
      INVENTORY_LOG_TABLE
    ]
  );

  return result.rows[0] || {};
};

const loadCartContextRows = async (db, userId, { cartItemIds = null, lock = false } = {}) => {
  const result = await db.query(
    `
      WITH cart AS (
        SELECT id
        FROM ${CART_TABLE}
        WHERE user_id = $1
        LIMIT 1
        ${lock ? 'FOR UPDATE' : ''}
      )
      SELECT
        cart.id AS cart_id,
        item.*
      FROM cart
      LEFT JOIN LATERAL (
        SELECT
          ci.id AS cart_item_id,
          ci.product_id,
          p.slug AS product_slug,
          ci.quantity,
          ci.size_label,
          ci.color_name,
          COALESCE(ci.color_variant_id, variant.color_variant_id) AS color_variant_id,
          variant.product_code,
          variant.article_number,
          p.name AS product_name,
          ${SELECTED_COLOR_PRICING_SQL.effectivePrice} AS product_price,
          ${SELECTED_COLOR_PRICING_SQL.comparePrice} AS original_price,
          ${SELECTED_COLOR_PRICING_SQL.pricingMode} AS pricing_mode,
          ${SELECTED_COLOR_PRICING_SQL.priceSource} AS price_source,
          product_image.image_url AS product_image,
          col.name AS collection_name,
          st.name AS style_name,
          c.name AS category_name,
          c.label AS category_label,
          d.name AS department_name,
          d.label AS department_label,
          EXISTS(
            SELECT 1
            FROM ${PRODUCT_INVENTORY_TABLE} pi_any
            WHERE pi_any.product_id = p.id
          ) AS has_variants,
          variant.id AS variant_id,
          variant.stock_quantity,
          COALESCE((to_jsonb(variant)->>'reserved_quantity')::int, 0) AS reserved_quantity
        FROM ${CART_ITEM_TABLE} ci
        JOIN ${PRODUCT_TABLE} p ON p.id = ci.product_id
        LEFT JOIN ${CATEGORY_TABLE} c ON c.id = p.category_id
        LEFT JOIN ${DEPARTMENT_TABLE} d ON d.id = p.department_id
        LEFT JOIN collections col ON col.id = p.collection_id
        LEFT JOIN styles st ON st.id = p.style_id
        LEFT JOIN LATERAL (
          SELECT pi.id, pi.color_variant_id, pi.product_code, pi.article_number, pi.stock_quantity, pi.reserved_quantity
          FROM ${PRODUCT_INVENTORY_TABLE} pi
          WHERE pi.product_id = p.id
            AND COALESCE(pi.size_label, '') = COALESCE(ci.size_label, '')
            AND (
              (ci.color_variant_id IS NOT NULL AND pi.color_variant_id = ci.color_variant_id)
              OR COALESCE(pi.color_name, '') = COALESCE(ci.color_name, '')
            )
          ORDER BY
            CASE
              WHEN ci.color_variant_id IS NOT NULL AND pi.color_variant_id = ci.color_variant_id THEN 0
              WHEN COALESCE(pi.color_name, '') = COALESCE(ci.color_name, '') THEN 1
              ELSE 2
            END
          LIMIT 1
          ${lock ? 'FOR UPDATE' : ''}
        ) variant ON true
        LEFT JOIN ${PRODUCT_COLOR_VARIANT_TABLE} price_variant
          ON price_variant.id = COALESCE(ci.color_variant_id, variant.color_variant_id)
         AND price_variant.deleted_at IS NULL
        LEFT JOIN LATERAL (
          SELECT pi.image_url
          FROM ${PRODUCT_IMAGE_TABLE} pi
          WHERE pi.product_id = p.id
            AND (
              (
                COALESCE(ci.color_variant_id, variant.color_variant_id) IS NOT NULL
                AND pi.color_variant_id = COALESCE(ci.color_variant_id, variant.color_variant_id)
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
              WHEN COALESCE(ci.color_variant_id, variant.color_variant_id) IS NOT NULL
                AND pi.color_variant_id = COALESCE(ci.color_variant_id, variant.color_variant_id) THEN 0
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
        WHERE ci.cart_id = cart.id
          AND ($2::uuid[] IS NULL OR ci.id = ANY($2::uuid[]))
        ORDER BY ci.created_at ASC, ci.id ASC
        ${lock ? 'FOR UPDATE OF ci, p' : ''}
      ) item ON true
    `,
    [userId, cartItemIds]
  );

  return result.rows;
};

const createOrderWithHistory = async (db, {
  userId,
  totals,
  voucherCode,
  paymentMethod,
  paymentStatus,
  orderStatus,
  shipping,
  paymentExpiresAt,
  historyNote
}) => {
  const result = await db.query(
    `
      WITH inserted_order AS (
        INSERT INTO ${ORDER_TABLE} (
          user_id,
          subtotal,
          shipping_fee,
          discount_amount,
          voucher_code,
          total_amount,
          payment_method,
          payment_status,
          order_status,
          shipping_full_name,
          shipping_phone,
          shipping_city,
          shipping_district,
          shipping_ward,
          shipping_address_line,
          shipping_note,
          payment_expires_at,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15, $16, $17, now(), now()
        )
        RETURNING *
      ),
      inserted_status_history AS (
        INSERT INTO ${ORDER_STATUS_HISTORY_TABLE} (
          order_id,
          old_status,
          new_status,
          changed_by,
          changed_by_role,
          note,
          created_at
        )
        SELECT id, NULL, $18, $19, $20, $21, now()
        FROM inserted_order
        RETURNING id
      )
      SELECT * FROM inserted_order
    `,
    [
      userId,
      totals.subtotal,
      totals.shippingFee,
      totals.discountAmount,
      voucherCode || null,
      totals.totalAmount,
      paymentMethod,
      paymentStatus,
      orderStatus,
      shipping.fullName,
      shipping.phone,
      shipping.city,
      shipping.district,
      shipping.ward,
      shipping.addressLine,
      shipping.note || null,
      paymentExpiresAt,
      orderStatus,
      userId,
      USER_ROLE.USER,
      historyNote
    ]
  );

  return result.rows[0] || null;
};

const reserveItems = async (db, {
  orderId,
  items,
  schema,
  userId,
  discountAmount = 0,
  cartId,
  cartItemIds,
  checkoutPayload
}) => {
  const orderItemColumns = [
    'order_id',
    'product_id',
    ...(schema.hasOrderItemVariantId ? ['variant_id'] : []),
    'product_name',
    'product_price',
    ...(schema.hasOrderItemPriceAtPurchase ? ['price_at_purchase'] : []),
    ...(schema.hasOrderItemOriginalPriceAtPurchase ? ['original_price_at_purchase'] : []),
    ...(schema.hasOrderItemPricingModeAtPurchase ? ['pricing_mode_at_purchase'] : []),
    ...(schema.hasOrderItemColorVariantId ? ['color_variant_id'] : []),
    ...(schema.hasOrderItemProductCodeAtPurchase ? ['product_code_at_purchase'] : []),
    ...(schema.hasOrderItemArticleNumberAtPurchase ? ['article_number_at_purchase'] : []),
    'quantity',
    ...(schema.hasOrderItemReservedQuantity ? ['reserved_quantity'] : []),
    'size_label',
    'color_name',
    'product_image',
    'gross_line_total',
    'item_discount_amount',
    'voucher_discount_allocated',
    'net_line_total'
  ];
  const selectColumns = orderItemColumns.map(column => `input_items.${column}`);
  const allocatedItems = allocateOrderDiscount(
    items.map(item => ({ ...item, unitPrice: item.productPrice })),
    discountAmount
  );
  const payload = allocatedItems.map((item, position) => ({
    position,
    order_id: orderId,
    product_id: item.productId,
    variant_id: item.inventoryContext.variantId || null,
    product_name: item.productName,
    product_price: item.productPrice,
    price_at_purchase: item.productPrice,
    original_price_at_purchase: item.originalPrice,
    pricing_mode_at_purchase: item.pricingMode,
    color_variant_id: item.colorVariantId || null,
    product_code_at_purchase: item.productCode || item.articleNumber || null,
    article_number_at_purchase: item.articleNumber || item.productCode || null,
    quantity: item.quantity,
    reserved_quantity: item.inventoryContext.variantId ? item.quantity : 0,
    size_label: item.sizeLabel || null,
    color_name: item.colorName || null,
    product_image: item.productImage || null,
    gross_line_total: item.grossLineTotal,
    item_discount_amount: roundMoney(
      Math.max(0, Number(item.originalPrice || item.productPrice) - Number(item.productPrice || 0)) * item.quantity
    ),
    voucher_discount_allocated: item.voucherDiscountAllocated,
    net_line_total: item.netLineTotal
  }));
  const inventoryLogCte = schema.hasInventoryLogs
    ? `,
      inserted_inventory_logs AS (
        INSERT INTO ${INVENTORY_LOG_TABLE} (
          product_id, variant_id, type, quantity, note, created_by, created_at
        )
        SELECT
          updated_variant.product_id,
          updated_variant.variant_id,
          'reserve_hold',
          updated_variant.quantity,
          $2,
          $3,
          now()
        FROM updated_variant
        RETURNING id
      )`
    : '';
  const inventoryLogSelect = schema.hasInventoryLogs
    ? ', (SELECT COUNT(*)::int FROM inserted_inventory_logs) AS log_count'
    : ', 0::int AS log_count';
  const paymentProvider = checkoutPayload.paymentMethod === PAYMENT_METHOD.BANK_TRANSFER
    ? PAYMENT_METHOD.BANK_TRANSFER
    : PAYMENT_METHOD.COD;
  const values = [
    JSON.stringify(payload),
    `Reserved for order ${orderId}`,
    userId,
    cartId,
    cartItemIds,
    checkoutPayload.shippingFullName,
    checkoutPayload.shippingPhone,
    paymentProvider
  ];
  const result = await db.query(
    `
      WITH input_items AS (
        SELECT *
        FROM jsonb_to_recordset($1::jsonb) AS input_items(
          position int,
          order_id uuid,
          product_id uuid,
          variant_id uuid,
          product_name text,
          product_price numeric,
          price_at_purchase numeric,
          original_price_at_purchase numeric,
          pricing_mode_at_purchase text,
          color_variant_id uuid,
          product_code_at_purchase text,
          article_number_at_purchase text,
          quantity int,
          reserved_quantity int,
          size_label text,
          color_name text,
          product_image text,
          gross_line_total numeric,
          item_discount_amount numeric,
          voucher_discount_allocated numeric,
          net_line_total numeric
        )
      ),
      inserted_order_items AS (
        INSERT INTO ${ORDER_ITEM_TABLE} (${orderItemColumns.join(', ')}, created_at, updated_at)
        SELECT ${selectColumns.join(', ')}, now(), now()
        FROM input_items
        ORDER BY input_items.position
        RETURNING *
      ),
      updated_variant AS (
        UPDATE ${PRODUCT_INVENTORY_TABLE} pi
        SET reserved_quantity = COALESCE(pi.reserved_quantity, 0) + inserted_order_items.quantity,
            updated_at = now()
        FROM inserted_order_items
        WHERE pi.id = inserted_order_items.variant_id
          AND pi.stock_quantity - COALESCE(pi.reserved_quantity, 0) >= inserted_order_items.quantity
        RETURNING
          pi.id AS variant_id,
          pi.product_id,
          inserted_order_items.id AS order_item_id,
          inserted_order_items.quantity
      )
      ${inventoryLogCte}
      , deleted_cart_items AS (
        DELETE FROM ${CART_ITEM_TABLE}
        WHERE cart_id = $4
          AND id = ANY($5::uuid[])
        RETURNING id
      ),
      touched_cart AS (
        UPDATE ${CART_TABLE}
        SET updated_at = now()
        WHERE id = $4
        RETURNING id
      ),
      upsert_profile AS (
        INSERT INTO ${USER_PROFILE_TABLE} (
          user_id, full_name, phone, payment_provider,
          card_holder_name, card_last4, card_brand, created_at, updated_at
        )
        VALUES ($3, $6, $7, $8, '', '', '', now(), now())
        ON CONFLICT (user_id) DO UPDATE
        SET full_name = COALESCE(NULLIF(${USER_PROFILE_TABLE}.full_name, ''), EXCLUDED.full_name),
            phone = COALESCE(NULLIF(${USER_PROFILE_TABLE}.phone, ''), EXCLUDED.phone),
            payment_provider = EXCLUDED.payment_provider,
            card_holder_name = '',
            card_last4 = '',
            card_brand = '',
            updated_at = now()
        RETURNING user_id
      )
      SELECT
        (SELECT COUNT(*)::int FROM input_items) AS input_count,
        (SELECT COUNT(*)::int FROM inserted_order_items) AS inserted_count,
        (SELECT COUNT(*)::int FROM updated_variant) AS updated_count,
        (SELECT COUNT(*)::int FROM inserted_order_items) AS refund_snapshot_count,
        (SELECT COUNT(*)::int FROM deleted_cart_items) AS deleted_cart_item_count,
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', inserted_order_items.id,
              'productId', inserted_order_items.product_id,
              'variantId', inserted_order_items.variant_id,
              'colorVariantId', to_jsonb(inserted_order_items)->>'color_variant_id',
              'createdAt', inserted_order_items.created_at,
              'updatedAt', inserted_order_items.updated_at
            )
            ORDER BY inserted_order_items.created_at ASC, inserted_order_items.id ASC
          )
          FROM inserted_order_items
        ), '[]'::jsonb) AS order_items,
        COALESCE(ARRAY(
          SELECT DISTINCT updated_variant.product_id FROM updated_variant
        ), ARRAY[]::uuid[]) AS product_ids,
        GREATEST(
          (SELECT COUNT(*)::int FROM ${CART_ITEM_TABLE} WHERE cart_id = $4)
            - (SELECT COUNT(*)::int FROM deleted_cart_items),
          0
        ) AS remaining_cart_item_count,
        (SELECT COUNT(*)::int FROM touched_cart) AS touched_cart_count,
        (SELECT COUNT(*)::int FROM upsert_profile) AS profile_count
        ${inventoryLogSelect}
    `,
    values
  );

  return result.rows[0] || {};
};

const snapshotRefundValues = (db, orderId, discountAmount) => db.query(
  `
    WITH line_values AS (
      SELECT
        oi.id,
        ROUND(COALESCE(NULLIF(oi.price_at_purchase, 0), oi.product_price, 0) * oi.quantity, 2) AS gross_total,
        ROUND(
          GREATEST(
            COALESCE(oi.original_price_at_purchase, oi.product_price, 0)
              - COALESCE(NULLIF(oi.price_at_purchase, 0), oi.product_price, 0),
            0
          ) * oi.quantity,
          2
        ) AS sale_discount,
        ROW_NUMBER() OVER (ORDER BY oi.id) AS line_number,
        COUNT(*) OVER () AS line_count,
        SUM(COALESCE(NULLIF(oi.price_at_purchase, 0), oi.product_price, 0) * oi.quantity) OVER () AS order_line_total
      FROM ${ORDER_ITEM_TABLE} oi
      WHERE oi.order_id = $1
    ), provisional AS (
      SELECT
        line_values.*,
        CASE
          WHEN $2::numeric <= 0 OR order_line_total <= 0 THEN 0::numeric
          WHEN line_number = line_count THEN NULL::numeric
          ELSE FLOOR($2::numeric * gross_total * 100 / order_line_total) / 100
        END AS provisional_allocation
      FROM line_values
    ), allocated AS (
      SELECT
        provisional.*,
        CASE
          WHEN $2::numeric <= 0 OR order_line_total <= 0 THEN 0::numeric
          WHEN line_number = line_count THEN GREATEST(
            $2::numeric - COALESCE(SUM(provisional_allocation) FILTER (WHERE provisional_allocation IS NOT NULL) OVER (), 0),
            0
          )
          ELSE provisional_allocation
        END AS voucher_allocation
      FROM provisional
    )
    UPDATE ${ORDER_ITEM_TABLE} oi
    SET gross_line_total = allocated.gross_total,
        item_discount_amount = allocated.sale_discount,
        voucher_discount_allocated = LEAST(allocated.voucher_allocation, allocated.gross_total),
        net_line_total = GREATEST(allocated.gross_total - allocated.voucher_allocation, 0),
        updated_at = now()
    FROM allocated
    WHERE allocated.id = oi.id
  `,
  [orderId, discountAmount]
);

const removePurchasedItemsAndSaveProfile = async (db, {
  cartId,
  cartItemIds,
  checkoutPayload,
  userId
}) => {
  const paymentProvider = checkoutPayload.paymentMethod === PAYMENT_METHOD.BANK_TRANSFER
    ? PAYMENT_METHOD.BANK_TRANSFER
    : PAYMENT_METHOD.COD;
  const result = await db.query(
    `
      WITH deleted_items AS (
        DELETE FROM ${CART_ITEM_TABLE}
        WHERE cart_id = $1
          AND id = ANY($2::uuid[])
        RETURNING id
      ),
      touched_cart AS (
        UPDATE ${CART_TABLE}
        SET updated_at = now()
        WHERE id = $1
        RETURNING id
      ),
      upsert_profile AS (
        INSERT INTO ${USER_PROFILE_TABLE} (
          user_id, full_name, phone, payment_provider,
          card_holder_name, card_last4, card_brand, created_at, updated_at
        )
        VALUES ($3, $4, $5, $6, '', '', '', now(), now())
        ON CONFLICT (user_id) DO UPDATE
        SET full_name = COALESCE(NULLIF(${USER_PROFILE_TABLE}.full_name, ''), EXCLUDED.full_name),
            phone = COALESCE(NULLIF(${USER_PROFILE_TABLE}.phone, ''), EXCLUDED.phone),
            payment_provider = EXCLUDED.payment_provider,
            card_holder_name = '',
            card_last4 = '',
            card_brand = '',
            updated_at = now()
        RETURNING user_id
      )
      SELECT GREATEST(
        (SELECT COUNT(*)::int FROM ${CART_ITEM_TABLE} WHERE cart_id = $1)
          - (SELECT COUNT(*)::int FROM deleted_items),
        0
      ) AS remaining_count
      FROM upsert_profile
    `,
    [
      cartId,
      cartItemIds,
      userId,
      checkoutPayload.shippingFullName,
      checkoutPayload.shippingPhone,
      paymentProvider
    ]
  );

  return Number(result.rows[0] && result.rows[0].remaining_count || 0);
};

const activateBankTransferPayment = async (db, orderId, userId, paymentWindowMinutes) => {
  const result = await db.query(
    `
      UPDATE ${ORDER_TABLE}
      SET payment_expires_at = CASE
            WHEN payment_activated_at IS NULL
              THEN clock_timestamp() + ($3::int * interval '1 minute')
            ELSE payment_expires_at
          END,
          payment_activated_at = COALESCE(payment_activated_at, clock_timestamp()),
          updated_at = CASE WHEN payment_activated_at IS NULL THEN now() ELSE updated_at END
      WHERE id = $1
        AND user_id = $2
        AND payment_method = '${PAYMENT_METHOD.BANK_TRANSFER}'
        AND payment_status = '${PAYMENT_STATUS.PENDING_PAYMENT}'
        AND order_status = '${ORDER_STATUS.PENDING}'
        AND payment_expires_at > now()
      RETURNING *
    `,
    [orderId, userId, paymentWindowMinutes]
  );
  return result.rows[0] || null;
};

const reportBankTransfer = async (db, orderId, userId) => {
  const result = await db.query(
    `
      UPDATE ${ORDER_TABLE}
      SET payment_status = $3,
          payment_reported_at = now(),
          payment_reviewed_at = NULL,
          payment_reviewed_by = NULL,
          payment_review_reason = NULL,
          payment_received_amount = NULL,
          updated_at = now()
      WHERE id = $1
        AND user_id = $2
        AND payment_method = $4
        AND payment_status = $5
        AND order_status = $6
        AND payment_expires_at > now()
      RETURNING *
    `,
    [
      orderId,
      userId,
      PAYMENT_STATUS.UNDER_REVIEW,
      PAYMENT_METHOD.BANK_TRANSFER,
      PAYMENT_STATUS.PENDING_PAYMENT,
      ORDER_STATUS.PENDING
    ]
  );
  return result.rows[0] || null;
};

const findOwnedOrder = async (db, orderId, userId) => {
  const result = await db.query(
    `SELECT * FROM ${ORDER_TABLE} WHERE id = $1 AND user_id = $2 LIMIT 1`,
    [orderId, userId]
  );
  return result.rows[0] || null;
};

module.exports = {
  createOrderWithHistory,
  findOwnedOrder,
  loadCartContextRows,
  probeSchemaCapabilities,
  activateBankTransferPayment,
  removePurchasedItemsAndSaveProfile,
  reportBankTransfer,
  reserveItems,
  snapshotRefundValues
};
