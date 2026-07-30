// Admin inventory handlers: validate requests and delegate persistence to InventoryModel.
module.exports = ({
  LOW_STOCK_THRESHOLD,
  buildPaginationPayload,
  getDb,
  inventoryModel,
  parseListQuery,
  sendError
}) => {
  const controller = {};

  const serializeInventoryVariant = row => ({
    id: String(row.id || ''),
    productId: String(row.product_id || ''),
    productName: String(row.product_name || ''),
    colorVariantId: row.color_variant_id ? String(row.color_variant_id) : '',
    productCode: String(row.product_code || row.article_number || ''),
    articleNumber: String(row.article_number || row.product_code || ''),
    gender: String(row.department_name || '').toLowerCase(),
    productGroupId: row.product_group_id ? String(row.product_group_id) : '',
    productGroup: String(row.product_group_label || row.product_group_name || ''),
    productGroupLabel: String(row.product_group_label || row.product_group_name || ''),
    productGroupSlug: String(row.product_group_slug || ''),
    category: String(row.category_label || row.category_name || ''),
    price: Number(row.price || 0),
    imageUrl: String(row.image_url || ''),
    colorName: String(row.color_name || ''),
    colorHex: String(row.color_hex || ''),
    sizeLabel: String(row.size_label || ''),
    stockQuantity: Number(row.stock_quantity || 0),
    reservedQuantity: Number(row.reserved_quantity || 0),
    soldQuantity: Number(row.sold_quantity || 0),
    availableQuantity: Math.max(
      0,
      Number(row.stock_quantity || 0) - Number(row.reserved_quantity || 0)
    ),
    updatedAt: row.updated_at || null
  });

  const normalizeInventoryLogType = type => {
    const value = String(type || '').toLowerCase();
    if (value === 'sold') return 'sale';
    if (value === 'release_hold') return 'cancel';
    if (value === 'refund') return 'return';
    if (['import', 'sale', 'cancel', 'adjustment', 'return'].includes(value)) return value;
    return 'adjustment';
  };

controller.importInventory = async (req, res) => {
  try {
    const db = getDb(req);
    const variantId = String(req.body.variantId || req.body.variant_id || '').trim();
    const quantity = Number.parseInt(req.body.quantity, 10);
    const note = String(req.body.note || '').trim();

    if (!variantId || !Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({
        message: 'Please choose a variant and import quantity greater than 0.'
      });
    }

    const variant = await inventoryModel.importStock(db, {
      variantId,
      quantity,
      note,
      adminUserId: req.authUser.id
    });

    if (!variant) {
      return res.status(404).json({ message: 'Inventory variant not found.' });
    }

    return res.json({
      message: 'Inventory imported successfully.',
      variant: {
        id: String(variant.id),
        productId: String(variant.product_id),
        stockQuantity: Number(variant.stock_quantity || 0),
        reservedQuantity: Number(variant.reserved_quantity || 0),
        soldQuantity: Number(variant.sold_quantity || 0),
        availableQuantity: Math.max(
          0,
          Number(variant.stock_quantity || 0) - Number(variant.reserved_quantity || 0)
        ),
        updatedAt: variant.updated_at || null
      }
    });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

controller.listInventory = async (req, res) => {
  try {
    const db = getDb(req);
    const pagination = parseListQuery(req.query, { limit: 10, maxLimit: 60 });
    const result = await inventoryModel.listAdmin(db, {
      ...pagination,
      category: String(req.query.category || '').trim(),
      gender: String(req.query.gender || req.query.department || '').trim().toLowerCase(),
      productGroup: String(
        req.query.group || req.query.productGroup || req.query.product_group || ''
      ).trim(),
      stockRange: String(req.query.stockRange || '').trim().toLowerCase(),
      dateRange: String(req.query.dateRange || '').trim().toLowerCase()
    }, LOW_STOCK_THRESHOLD);
    const stats = result.stats;

    return res.json({
      items: result.rows.map(serializeInventoryVariant),
      logs: [],
      stats: {
        totalProducts: Number(stats.total_products || 0),
        inStockProducts: Number(stats.in_stock_products || 0),
        lowStockProducts: Number(stats.low_stock_products || 0),
        outOfStockProducts: Number(stats.out_of_stock_products || 0)
      },
      pagination: buildPaginationPayload(pagination, result.total)
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.getInventoryHistory = async (req, res) => {
  try {
    const db = getDb(req);
    const variantId = String(req.params.variantId || '').trim();
    const variant = await inventoryModel.findVariantById(db, variantId);

    if (!variant) {
      return res.status(404).json({ message: 'Inventory variant not found.' });
    }

    const logsResult = await inventoryModel.listHistoryByVariant(db, variantId);

    return res.json({
      variant: {
        id: String(variant.id),
        productId: String(variant.product_id),
        productName: String(variant.product_name || ''),
        colorVariantId: variant.color_variant_id ? String(variant.color_variant_id) : '',
        productCode: String(variant.product_code || variant.article_number || ''),
        articleNumber: String(variant.article_number || variant.product_code || ''),
        colorName: String(variant.color_name || ''),
        sizeLabel: String(variant.size_label || '')
      },
      items: logsResult.rows.map(row => ({
        id: String(row.id || ''),
        movementType: normalizeInventoryLogType(row.type),
        rawType: String(row.type || ''),
        quantity: Number(row.quantity || 0),
        oldStock: row.old_stock === null || row.old_stock === undefined
          ? null
          : Number(row.old_stock || 0),
        newStock: row.new_stock === null || row.new_stock === undefined
          ? null
          : Number(row.new_stock || 0),
        reservedAfter: row.reserved_after === null || row.reserved_after === undefined
          ? null
          : Number(row.reserved_after || 0),
        soldAfter: row.sold_after === null || row.sold_after === undefined
          ? null
          : Number(row.sold_after || 0),
        note: String(row.note || ''),
        createdBy: String(row.created_by_name || row.created_by_role || 'System'),
        createdByRole: String(row.created_by_role || ''),
        createdAt: row.created_at || null
      }))
    });
  } catch (error) {
    return sendError(res, error);
  }
};

  return controller;
};
