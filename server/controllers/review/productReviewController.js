// Product review handlers: public review listing and authenticated review creation after purchase.
module.exports = ({
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
}) => {
  const controller = {};

controller.getProductReviews = async (req, res) => {
  try {
    const db = getDb(req);
    const productId = assertUuid(req.params.productId, 'Product id');

    await ensureProductExists(db, productId);

    const [reviewsResult, summary] = await Promise.all([
      reviewModel.listPublicByProduct(db, productId),
      fetchReviewSummary(db, productId)
    ]);

    return res.json({
      ...summary,
      items: reviewsResult.rows.map(serializePublicReview)
    });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

controller.createProductReview = async (req, res) => {
  try {
    const db = getDb(req);
    const productId = assertUuid(req.params.productId, 'Product id');
    const orderId = assertUuid(req.body.orderId || req.body.order_id, 'Order id');
    const rating = normalizeRating(req.body.rating);
    const comment = normalizeComment(req.body.comment);

    await ensureProductExists(db, productId);

    const existingReview = await reviewModel.findExisting(db, req.authUser.id, productId, orderId || null);

    if (existingReview.rowCount) {
      return res.status(409).json({
        message: 'You already reviewed this product for this order.'
      });
    }

    const purchasedOrder = await findCompletedOrderItemForReview(db, req.authUser.id, productId, orderId);

    if (!purchasedOrder) {
      return res.status(403).json({
        message: 'You can review this product after the order is completed.'
      });
    }

    const result = await reviewModel.create(db, {
      productId,
      userId: req.authUser.id,
      orderId: purchasedOrder.id,
      rating,
      comment
    });

    await syncProductReviewStats(db, productId);
    if (typeof notifyNewReview === 'function') {
      await notifyNewReview(req, db, result.rows[0].id).catch(() => null);
    }

    return res.status(201).json({
      item: serializeAccountReview({
        ...result.rows[0],
        product_name: ''
      })
    });
  } catch (error) {
    if (error && error.code === '23505') {
      return res.status(409).json({
        message: 'You already reviewed this product for this order.'
      });
    }

    return sendError(res, error, 400);
  }
};

  return controller;
};
