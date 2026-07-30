// Account review handlers: member review list plus update/delete for their own reviews.
module.exports = ({
  assertUuid,
  getDb,
  normalizeComment,
  normalizeRating,
  reviewModel,
  sendError,
  serializeAccountReview,
  syncProductReviewStats
}) => {
  const controller = {};

controller.getAccountReviews = async (req, res) => {
  try {
    const db = getDb(req);
    const result = await reviewModel.listByUser(db, req.authUser.id);

    return res.json({
      items: result.rows.map(serializeAccountReview)
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.updateReview = async (req, res) => {
  try {
    const db = getDb(req);
    const reviewId = assertUuid(req.params.reviewId, 'Review id');
    const rating = normalizeRating(req.body.rating);
    const comment = normalizeComment(req.body.comment);

    const result = await reviewModel.updateOwned(db, reviewId, req.authUser.id, rating, comment);

    if (!result.rowCount) {
      return res.status(404).json({
        message: 'Review not found.'
      });
    }

    await syncProductReviewStats(db, result.rows[0].product_id);

    return res.json({
      item: serializeAccountReview({
        ...result.rows[0],
        product_name: ''
      })
    });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

controller.deleteReview = async (req, res) => {
  try {
    const db = getDb(req);
    const reviewId = assertUuid(req.params.reviewId, 'Review id');
    const result = await reviewModel.deleteOwned(db, reviewId, req.authUser.id);

    if (!result.rowCount) {
      return res.status(404).json({
        message: 'Review not found.'
      });
    }

    await syncProductReviewStats(db, result.rows[0].product_id);

    return res.json({
      deleted: true
    });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

  return controller;
};
