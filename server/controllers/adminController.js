const PRODUCT_TABLE = 'products';
const CATEGORY_TABLE = 'categories';
const PRODUCT_GROUP_TABLE = 'product_groups';
const COLLECTION_TABLE = 'collections';
const STYLE_TABLE = 'styles';
const PRODUCT_INVENTORY_TABLE = 'product_inventory';
const PRODUCT_IMAGE_TABLE = 'product_images';
const productModel = require('../models/productModel');
const { slugify } = productModel;
const categoryModel = require('../models/categoryModel');
const collectionModel = require('../models/collectionModel');
const voucherModel = require('../models/voucherModel');
const reviewModel = require('../models/reviewModel');
const userModel = require('../models/userModel');
const inventoryModel = require('../models/inventoryModel');
const catalogModel = require('../models/catalogModel');
const { invalidateUser: invalidateAuthUser } = require('../middleware/requireAuth');
const { isValidUuid } = require('../utils/authUtils');
const { createErrorResponder } = require('../utils/http');
const { buildPaginationPayload } = require('../utils/pagination');
const createDashboardController = require('./admin/dashboardController');
const createProductAdminController = require('./admin/productAdminController');
const createCatalogAdminController = require('./admin/catalogAdminController');
const createAccountAdminController = require('./admin/accountAdminController');
const createVoucherAdminController = require('./admin/voucherAdminController');
const createInventoryAdminController = require('./admin/inventoryAdminController');
const createNotificationAdminController = require('./admin/notificationAdminController');
const productController = require('./productController');
const {
  ORDER_STATUS,
  PAYMENT_STATUS,
  RECORD_STATUSES
} = require('../constants/domainConstants');

// Admin controller root:
// shared studio constants/serializers stay here; each admin page area is handled in controllers/admin/*.
const getDb = req => req.app.locals.db;
const NEW_ARRIVAL_WINDOW_DAYS = 60;
const LOW_STOCK_THRESHOLD = 5;

const sendError = createErrorResponder('Unexpected admin dashboard error.');

const toInteger = value => Number.parseInt(value, 10) || 0;

const normalizeActiveStatus = value => {
  const status = String(value || '').trim().toLowerCase();

  if (!RECORD_STATUSES.has(status)) {
    const error = new Error('Status must be active or inactive.');
    error.statusCode = 400;
    throw error;
  }

  return status;
};

const parseListQuery = (query = {}, defaults = {}) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || defaults.page || 1);
  const limit = Math.min(
    defaults.maxLimit || 80,
    Math.max(1, Number.parseInt(query.limit, 10) || defaults.limit || 10)
  );

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    search: String(query.search || query.q || '').trim(),
    status: String(query.status || '').trim().toLowerCase(),
    sort: String(query.sort || '').trim().toLowerCase()
  };
};

const normalizeOrderStatus = value => {
  const status = String(value || '').toLowerCase();

  if (status === 'shipped') return ORDER_STATUS.SHIPPING;
  if (status === 'refunded') return ORDER_STATUS.CANCELLED;
  return status;
};

const normalizePaymentStatus = value => {
  const status = String(value || '').toLowerCase();
  if (status === 'pending' || status === 'unpaid') return PAYMENT_STATUS.PENDING_PAYMENT;
  if (status === 'failed') return PAYMENT_STATUS.EXPIRED;
  return status;
};

const serializeRecentUser = row => ({
  id: String(row.id),
  name: String(row.name || ''),
  email: String(row.email || ''),
  role: String(row.role || 'user'),
  status: String(row.status || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active',
  emailVerified: row.email_verified === undefined ? true : Boolean(row.email_verified),
  createdAt: row.created_at || null
});

const serializeRecentOrder = row => ({
  id: String(row.id),
  customerName: String(row.customer_name || ''),
  customerEmail: String(row.customer_email || ''),
  totalAmount: Number(row.total_amount || 0),
  paymentMethod: String(row.payment_method || ''),
  paymentStatus: normalizePaymentStatus(row.payment_status),
  orderStatus: normalizeOrderStatus(row.order_status),
  itemCount: Number(row.item_count || 0),
  createdAt: row.created_at || null
});

const serializeMonthDate = value => {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  // Midday UTC keeps the intended calendar month stable in every client timezone.
  return `${year}-${month}-15T12:00:00.000Z`;
};

const serializeOrderTrendPoint = row => ({
  day: row.day || null,
  month: serializeMonthDate(row.month || row.day),
  revenue: Number(row.revenue || 0),
  orderCount: Number(row.order_count || 0)
});

const serializeAdminProduct = row => ({
  id: String(row.id || ''),
  name: String(row.name || ''),
  slug: String(row.slug || ''),
  gender: String(row.department_name || '').toLowerCase(),
  category: String(row.category_label || row.category_name || ''),
  categorySlug: String(row.category_slug || ''),
  productGroupId: row.product_group_id ? String(row.product_group_id) : '',
  productGroup: String(row.product_group_label || row.product_group_name || ''),
  productGroupLabel: String(row.product_group_label || row.product_group_name || ''),
  productGroupSlug: String(row.product_group_slug || ''),
  collection: String(row.collection_name || ''),
  collectionSlug: String(row.collection_slug || ''),
  styleId: row.style_id ? String(row.style_id) : '',
  styleName: String(row.style_name || ''),
  styleSlug: String(row.style_slug || ''),
  price: Number(row.price || 0),
  originalPrice: Number(row.original_price || row.price || 0),
  pricingMode: String(row.pricing_mode || (row.is_sale ? 'sale' : 'regular')),
  salePrice: row.sale_price === null || row.sale_price === undefined ? null : Number(row.sale_price || 0),
  isSale: Boolean(row.is_sale),
  inventory: Math.max(0, Number(row.stock_quantity || 0) - Number(row.reserved_quantity || 0)),
  stockQuantity: Number(row.stock_quantity || 0),
  reservedQuantity: Number(row.reserved_quantity || 0),
  soldQuantity: Number(row.sold_quantity || 0),
  orderedQuantity: Number(row.ordered_quantity || 0),
  status: String(row.status || 'active'),
  newArrival: Boolean(row.new_arrival),
  imageUrl: String(row.image_url || ''),
  createdAt: row.created_at || null,
  updatedAt: row.updated_at || null
});

const serializeAdminStyle = row => ({
  id: String(row.id || ''),
  name: String(row.name || ''),
  slug: String(row.slug || ''),
  productGroupId: row.product_group_id ? String(row.product_group_id) : '',
  productGroupSlug: String(row.product_group_slug || ''),
  productGroupLabel: String(row.product_group_label || ''),
  departmentId: row.department_id ? String(row.department_id) : '',
  departmentName: String(row.department_name || ''),
  categoryId: row.category_id ? String(row.category_id) : '',
  categorySlug: String(row.category_slug || ''),
  categoryLabel: String(row.category_label || ''),
  status: String(row.status || 'active'),
  productCount: Number(row.product_count || 0),
  createdAt: row.created_at || null
});

const serializeAdminFit = row => ({
  id: String(row.id || ''),
  name: String(row.name || ''),
  slug: String(row.slug || ''),
  productGroupId: row.product_group_id ? String(row.product_group_id) : '',
  productGroupSlug: String(row.product_group_slug || ''),
  productGroupLabel: String(row.product_group_label || ''),
  departmentId: row.department_id ? String(row.department_id) : '',
  departmentName: String(row.department_name || ''),
  status: String(row.status || 'active'),
  productCount: Number(row.product_count || 0),
  createdAt: row.created_at || null
});

const serializeAdminMaterial = row => ({
  id: String(row.id || ''),
  name: String(row.name || ''),
  label: String(row.name || ''),
  value: String(row.slug || row.name || ''),
  slug: String(row.slug || ''),
  productGroupId: row.product_group_id ? String(row.product_group_id) : '',
  productGroupSlug: String(row.product_group_slug || ''),
  productGroupLabel: String(row.product_group_label || ''),
  departmentId: row.department_id ? String(row.department_id) : '',
  departmentName: String(row.department_name || ''),
  departmentLabel: String(row.department_label || ''),
  status: String(row.status || 'active'),
  sortOrder: Number(row.sort_order || 0),
  productCount: Number(row.product_count || 0),
  createdAt: row.created_at || null
});

const serializeAdminProductReview = row => ({
  id: String(row.id || ''),
  productId: String(row.product_id || ''),
  productName: String(row.product_name || ''),
  productSlug: String(row.product_slug || ''),
  productGroupId: row.product_group_id ? String(row.product_group_id) : '',
  productGroup: String(row.product_group_label || row.product_group_name || ''),
  productGroupLabel: String(row.product_group_label || row.product_group_name || ''),
  productGroupSlug: String(row.product_group_slug || ''),
  productImage: String(row.product_image || ''),
  customerId: String(row.user_id || ''),
  customerName: String(row.customer_name || ''),
  customerEmail: String(row.customer_email || ''),
  orderId: row.order_id ? String(row.order_id) : '',
  rating: Number(row.rating || 0),
  comment: String(row.comment || ''),
  adminReply: String(row.admin_reply || ''),
  adminReplyBy: row.admin_reply_by ? String(row.admin_reply_by) : '',
  adminReplyAt: row.admin_reply_at || null,
  adminReplyUpdatedAt: row.admin_reply_updated_at || null,
  colorVariantId: row.color_variant_id ? String(row.color_variant_id) : '',
  colorName: String(row.color_name || ''),
  sizeLabel: String(row.size_label || ''),
  isApproved: Boolean(row.is_approved),
  createdAt: row.created_at || null,
  updatedAt: row.updated_at || null
});

const serializeAdminCategory = row => ({
  id: String(row.id || ''),
  name: String(row.name || ''),
  label: String(row.label || row.name || ''),
  slug: String(row.slug || ''),
  departmentId: row.department_id ? String(row.department_id) : '',
  departmentName: String(row.department_name || ''),
  productGroupId: row.product_group_id ? String(row.product_group_id) : '',
  productGroup: String(row.product_group_label || row.product_group_name || ''),
  productGroupLabel: String(row.product_group_label || row.product_group_name || ''),
  productGroupSlug: String(row.product_group_slug || ''),
  status: String(row.status || 'active'),
  productCount: Number(row.product_count || 0),
  createdAt: row.created_at || null,
  updatedAt: row.updated_at || null
});

const serializeAdminProductGroup = row => ({
  id: String(row.id || ''),
  name: String(row.name || ''),
  label: String(row.label || row.name || ''),
  slug: String(row.slug || ''),
  status: String(row.status || 'active'),
  sortOrder: Number(row.sort_order || 0),
  categoryCount: Number(row.category_count || 0),
  productCount: Number(row.product_count || 0),
  createdAt: row.created_at || null,
  updatedAt: row.updated_at || null
});

const serializeAdminCollection = row => ({
  id: String(row.id || ''),
  name: String(row.name || ''),
  slug: String(row.slug || ''),
  bannerImage: String(row.banner_image || ''),
  departments: (Array.isArray(row.departments) ? row.departments : []).map(item => ({
    id: String(item.id || ''),
    departmentId: String(item.departmentId || item.department_id || ''),
    departmentName: String(item.departmentName || item.department_name || ''),
    departmentLabel: String(item.departmentLabel || item.department_label || ''),
    bannerImage: String(item.bannerImage || item.banner_image_url || ''),
    bannerPublicId: String(item.bannerPublicId || item.banner_public_id || ''),
    status: String(item.status || 'active')
  })),
  status: String(row.status || 'active'),
  productCount: Number(row.product_count || 0),
  createdAt: row.created_at || null,
  updatedAt: row.updated_at || null
});

const serializeVoucher = row => ({
  id: String(row.id || ''),
  code: String(row.code || ''),
  discountType: String(row.discount_type || ''),
  discountValue: Number(row.discount_value || 0),
  minOrderAmount: Number(row.min_order_amount || 0),
  maxDiscountAmount: row.max_discount_amount === null || row.max_discount_amount === undefined
    ? null
    : Number(row.max_discount_amount || 0),
  startDate: row.start_date || null,
  endDate: row.end_date || null,
  usageLimit: row.usage_limit === null || row.usage_limit === undefined ? null : Number(row.usage_limit || 0),
  usedCount: Number(row.used_count || 0),
  status: String(row.status || 'active'),
  createdAt: row.created_at || null,
  updatedAt: row.updated_at || null
});

exports.dashboard = createDashboardController({
  LOW_STOCK_THRESHOLD,
  buildPaginationPayload,
  getDb,
  sendError,
  serializeOrderTrendPoint,
  serializeRecentOrder,
  toInteger
});

exports.listNotifications = createNotificationAdminController({
  LOW_STOCK_THRESHOLD,
  getDb,
  sendError
});

const productAdminController = createProductAdminController({
  CATEGORY_TABLE,
  COLLECTION_TABLE,
  NEW_ARRIVAL_WINDOW_DAYS,
  PRODUCT_IMAGE_TABLE,
  PRODUCT_INVENTORY_TABLE,
  PRODUCT_GROUP_TABLE,
  PRODUCT_TABLE,
  STYLE_TABLE,
  buildPaginationPayload,
  getDb,
  isValidUuid,
  normalizeActiveStatus,
  parseListQuery,
  productModel,
  reviewModel,
  sendError,
  serializeAdminProduct,
  serializeAdminProductReview
});

exports.listProducts = productAdminController.listProducts;
exports.updateProductStatus = productAdminController.updateProductStatus;
exports.listProductReviews = productAdminController.listProductReviews;
exports.updateProductReviewReply = productAdminController.updateProductReviewReply;
exports.deleteProductReviewReply = productAdminController.deleteProductReviewReply;

const catalogAdminController = createCatalogAdminController({
  buildPaginationPayload,
  catalogModel,
  categoryModel,
  collectionModel,
  getDb,
  invalidateProductListCache: productController.invalidateProductListCache,
  normalizeActiveStatus,
  parseListQuery,
  sendError,
  serializeAdminCategory,
  serializeAdminCollection,
  serializeAdminFit,
  serializeAdminMaterial,
  serializeAdminProductGroup,
  serializeAdminStyle,
  slugify
});

exports.listCategories = catalogAdminController.listCategories;
exports.readCategory = catalogAdminController.readCategory;
exports.listProductGroups = catalogAdminController.listProductGroups;
exports.listStyles = catalogAdminController.listStyles;
exports.listFits = catalogAdminController.listFits;
exports.listMaterials = catalogAdminController.listMaterials;
exports.listCollections = catalogAdminController.listCollections;
exports.readCollection = catalogAdminController.readCollection;
exports.createCategory = catalogAdminController.createCategory;
exports.updateCategory = catalogAdminController.updateCategory;
exports.updateCategoryStatus = catalogAdminController.updateCategoryStatus;
exports.deleteCategory = catalogAdminController.deleteCategory;
exports.createCollection = catalogAdminController.createCollection;
exports.updateCollection = catalogAdminController.updateCollection;
exports.updateCollectionStatus = catalogAdminController.updateCollectionStatus;
exports.deleteCollection = catalogAdminController.deleteCollection;

const accountAdminController = createAccountAdminController({
  buildPaginationPayload,
  getDb,
  isValidUuid,
  parseListQuery,
  sendError,
  serializeRecentUser,
  invalidateAuthUser,
  normalizeActiveStatus,
  userModel
});

exports.listAccounts = accountAdminController.listAccounts;
exports.readCustomer = accountAdminController.readCustomer;
exports.readCustomerOrders = accountAdminController.readCustomerOrders;
exports.updateAccountStatus = accountAdminController.updateAccountStatus;

const voucherAdminController = createVoucherAdminController({
  buildPaginationPayload,
  getDb,
  parseListQuery,
  sendError,
  serializeVoucher,
  voucherModel
});

exports.listVouchers = voucherAdminController.listVouchers;
exports.readVoucher = voucherAdminController.readVoucher;
exports.createVoucher = voucherAdminController.createVoucher;
exports.updateVoucher = voucherAdminController.updateVoucher;
exports.deleteVoucher = voucherAdminController.deleteVoucher;

const inventoryAdminController = createInventoryAdminController({
  LOW_STOCK_THRESHOLD,
  buildPaginationPayload,
  getDb,
  inventoryModel,
  parseListQuery,
  sendError
});

exports.importInventory = inventoryAdminController.importInventory;
exports.listInventory = inventoryAdminController.listInventory;
exports.getInventoryHistory = inventoryAdminController.getInventoryHistory;
