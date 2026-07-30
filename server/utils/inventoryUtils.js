const PRODUCT_TABLE = 'products';
const PRODUCT_INVENTORY_TABLE = 'product_inventory';

let productSummaryColumns = null;

const loadProductSummaryColumns = async db => {
  if (String(process.env.PRODUCT_SUMMARY_COLUMNS_PROBE || '').toLowerCase() !== 'true') {
    productSummaryColumns = new Set();
    return productSummaryColumns;
  }

  if (productSummaryColumns) {
    return productSummaryColumns;
  }

  const result = await db.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = ANY($2::text[])
    `,
    [PRODUCT_TABLE, ['inventory', 'reserved_inventory', 'sold_quantity']]
  );

  productSummaryColumns = new Set(result.rows.map(row => row.column_name));
  return productSummaryColumns;
};

const syncProductInventorySummary = async (db, productId) => {
  if (!productId) {
    return;
  }

  const columns = await loadProductSummaryColumns(db);
  const setClauses = ['updated_at = now()'];
  const hasInventorySummaryColumns = ['inventory', 'reserved_inventory', 'sold_quantity'].some(column =>
    columns.has(column)
  );

  if (!hasInventorySummaryColumns) {
    return;
  }

  if (columns.has('inventory')) {
    setClauses.unshift('inventory = summary.stock_quantity');
  }

  if (columns.has('reserved_inventory')) {
    setClauses.unshift('reserved_inventory = summary.reserved_quantity');
  }

  if (columns.has('sold_quantity')) {
    setClauses.unshift('sold_quantity = summary.sold_quantity');
  }

  await db.query(
    `
      UPDATE ${PRODUCT_TABLE} p
      SET ${setClauses.join(', ')}
      FROM (
        SELECT
          $1::uuid AS product_id,
          COALESCE(SUM(stock_quantity), 0)::int AS stock_quantity,
          COALESCE(SUM(reserved_quantity), 0)::int AS reserved_quantity,
          COALESCE(SUM(sold_quantity), 0)::int AS sold_quantity
        FROM ${PRODUCT_INVENTORY_TABLE}
        WHERE product_id = $1
      ) summary
      WHERE p.id = summary.product_id
    `,
    [productId]
  );
};

module.exports = {
  syncProductInventorySummary
};
