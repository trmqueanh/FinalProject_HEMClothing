const { isValidUuid } = require('../utils/authUtils');
const { createErrorResponder } = require('../utils/http');
const cartModel = require('../models/cartModel');
const { USER_ROLE } = require('../constants/domainConstants');
const createReadCartController = require('./cart/readCartController');
const createItemCartController = require('./cart/itemCartController');

// Cart controller root: request validation and response mapping stay here;
// all cart persistence is handled by CartModel.
const sendError = createErrorResponder('Unexpected cart error.');

const getDb = req => req.app.locals.db;

const normalizeInteger = (value, fallback = 1) => {
  const nextValue = Number.parseInt(value, 10);

  if (!Number.isFinite(nextValue) || nextValue <= 0) {
    return fallback;
  }

  return nextValue;
};

const ensureCustomerAccount = req => {
  if (!req.authUser) {
    const error = new Error('Authentication required.');
    error.statusCode = 401;
    throw error;
  }

  if (req.authUser.role === USER_ROLE.ADMIN) {
    const error = new Error('Admin accounts cannot use the shopping cart.');
    error.statusCode = 403;
    throw error;
  }
};

const mapCartItem = row => {
  const quantity = Number(row.quantity || 0);
  const availableQuantity = row.available_inventory === null || row.available_inventory === undefined
    ? quantity
    : Number(row.available_inventory || 0);

  return {
    lineId: String(row.cart_item_id),
    cartItemId: String(row.cart_item_id),
    productId: String(row.product_id),
    productSlug: String(row.slug || ''),
    name: String(row.name || ''),
    category: String(row.category_name || ''),
    collection: String(row.collection_name || row.style_name || ''),
    price: Number(row.price || 0),
    originalPrice: Number(row.original_price || row.price || 0),
    pricingMode: String(row.pricing_mode || 'regular'),
    priceLabel: row.pricing_mode === 'sale' ? 'Sale' : '',
    quantity,
    availableQuantity,
    maxQuantity: availableQuantity,
    isMaxQuantity: quantity >= availableQuantity,
    size: String(row.size_label || 'One Size'),
    color: String(row.color_name || 'Default'),
    colorVariantId: row.color_variant_id ? String(row.color_variant_id) : '',
    productCode: String(row.product_code || row.article_number || ''),
    articleNumber: String(row.article_number || row.product_code || ''),
    imageUrl: String(row.image_url || ''),
    images: row.image_url ? [String(row.image_url)] : [],
    spotlight: String(row.category_name || row.collection_name || ''),
    palette: {
      base: '#efe8df',
      accent: '#1f2430',
      glow: '#faf5ef'
    }
  };
};

const mapCartRows = rows => {
  const cartId = rows[0] && rows[0].cart_id;

  return {
    id: cartId ? String(cartId) : null,
    items: rows.filter(row => row.cart_item_id).map(mapCartItem)
  };
};

const fetchCartPayload = async (db, userId) =>
  mapCartRows(await cartModel.fetchRows(db, userId));

const readCartController = createReadCartController({
  ensureCustomerAccount,
  fetchCartPayload,
  getDb,
  sendError
});

exports.getCart = readCartController.getCart;

const itemCartController = createItemCartController({
  cartModel,
  ensureCustomerAccount,
  getDb,
  isValidUuid,
  mapCartRows,
  normalizeInteger,
  sendError
});

exports.addCartItem = itemCartController.addCartItem;
exports.updateCartItem = itemCartController.updateCartItem;
exports.removeCartItem = itemCartController.removeCartItem;
exports.clearCart = itemCartController.clearCart;
