const { isValidUuid } = require('../utils/authUtils');
const { createErrorResponder } = require('../utils/http');
const reviewModel = require('../models/reviewModel');
const createProductReviewController = require('./review/productReviewController');
const createAccountReviewController = require('./review/accountReviewController');
const { notifyNewReview } = require('../services/notificationEmailService');

// Review controller root:
// shared review validation/stat helpers stay here; product and account review handlers are split below.
const getDb = req => req.app.locals.db;

const sendError = createErrorResponder('Unexpected review error.');

const normalizeComment = value => {
  const comment = String(value || '').trim();
  return comment ? comment.slice(0, 2000) : null;
};

const normalizeRating = value => {
  const rating = Number(value);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    const error = new Error('Rating must be between 1 and 5.');
    error.statusCode = 400;
    throw error;
  }

  return rating;
};

const assertUuid = (value, label) => {
  const id = String(value || '').trim();

  if (!isValidUuid(id)) {
    const error = new Error(`${label} is required.`);
    error.statusCode = 400;
    throw error;
  }

  return id;
};

const serializePublicReview = row => ({
  id: String(row.id),
  userName: String(row.user_name || 'Customer'),
  productName: String(row.product_name || 'Product review'),
  sizeLabel: String(row.size_label || ''),
  colorName: String(row.color_name || ''),
  rating: Number(row.rating || 0),
  comment: row.comment || '',
  adminReply: row.admin_reply || '',
  createdAt: row.created_at || null,
  updatedAt: row.updated_at || null
});

const serializeAccountReview = row => ({
  id: String(row.id),
  productId: String(row.product_id || ''),
  productName: String(row.product_name || 'Product review'),
  productImage: row.product_image || null,
  colorVariantId: row.color_variant_id ? String(row.color_variant_id) : '',
  sizeLabel: String(row.size_label || ''),
  colorName: String(row.color_name || ''),
  rating: Number(row.rating || 0),
  comment: row.comment || '',
  body: row.comment || '',
  adminReply: row.admin_reply || '',
  isApproved: row.is_approved !== false,
  status: row.is_approved === false ? 'pending' : 'approved',
  orderId: row.order_id ? String(row.order_id) : '',
  createdAt: row.created_at || null,
  updatedAt: row.updated_at || null
});

const ensureProductExists = async (db, productId) => {
  const result = await reviewModel.findProductById(db, productId);

  if (!result.rowCount) {
    const error = new Error('Product not found.');
    error.statusCode = 404;
    throw error;
  }
};

const findCompletedOrderForProduct = async (db, userId, productId) => {
  const result = await reviewModel.findCompletedOrderForProduct(db, userId, productId);

  return result.rows[0] || null;
};

const findCompletedOrderItemForReview = async (db, userId, productId, orderId) => {
  if (!orderId) {
    return findCompletedOrderForProduct(db, userId, productId);
  }

  const result = await reviewModel.findCompletedOrderItem(db, userId, productId, orderId);

  return result.rows[0] || null;
};

const fetchReviewSummary = async (db, productId) => {
  const result = await reviewModel.getSummary(db, productId);

  const row = result.rows[0] || {};
  return {
    averageRating: Number(row.average_rating || 0),
    reviewCount: Number(row.review_count || 0)
  };
};

const syncProductReviewStats = async (db, productId) => {
  const summary = await fetchReviewSummary(db, productId);

  await reviewModel.updateProductStats(db, productId, summary.averageRating, summary.reviewCount);

  return summary;
};

const productReviewController = createProductReviewController({
  assertUuid,
  ensureProductExists,
  fetchReviewSummary,
  findCompletedOrderItemForReview,
  getDb,
  normalizeComment,
  normalizeRating,
  notifyNewReview,
  reviewModel,
  sendError,
  serializeAccountReview,
  serializePublicReview,
  syncProductReviewStats
});

exports.getProductReviews = productReviewController.getProductReviews;
exports.createProductReview = productReviewController.createProductReview;

const accountReviewController = createAccountReviewController({
  assertUuid,
  getDb,
  normalizeComment,
  normalizeRating,
  reviewModel,
  sendError,
  serializeAccountReview,
  syncProductReviewStats
});

exports.getAccountReviews = accountReviewController.getAccountReviews;
exports.updateReview = accountReviewController.updateReview;
exports.deleteReview = accountReviewController.deleteReview;
