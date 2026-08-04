// Admin product list/review handlers: powers studio product tables without owning product create/edit payloads.
module.exports = ({
  NEW_ARRIVAL_WINDOW_DAYS,
  PRODUCT_INVENTORY_TABLE,
  buildPaginationPayload,
  getDb,
  invalidateProductListCache = () => {},
  isValidUuid,
  normalizeActiveStatus,
  parseListQuery,
  productModel,
  reviewModel,
  sendError,
  serializeAdminProduct,
  serializeAdminProductReview
}) => {
  const controller = {};

  const normalizeAdminReply = value => {
    const reply = String(value || '').trim();

    if (!reply) {
      const error = new Error('Reply cannot be empty.');
      error.statusCode = 400;
      throw error;
    }

    return reply.slice(0, 1000);
  };

controller.listProducts = async (req, res) => {
  try {
    const db = getDb(req);
    const pagination = parseListQuery(req.query, { limit: 10, maxLimit: 80 });
    const clauses = ['p.deleted_at IS NULL'];
    const values = [];

    if (pagination.search) {
      values.push(`%${pagination.search}%`);
      clauses.push(`(
        p.name ILIKE $${values.length}
        OR COALESCE(p.slug, '') ILIKE $${values.length}
        OR COALESCE(c.name, '') ILIKE $${values.length}
        OR COALESCE(c.label, '') ILIKE $${values.length}
        OR COALESCE(pg.name, '') ILIKE $${values.length}
        OR COALESCE(pg.label, '') ILIKE $${values.length}
        OR COALESCE(col.name, '') ILIKE $${values.length}
        OR COALESCE(st.name, '') ILIKE $${values.length}
        OR EXISTS (
          SELECT 1
          FROM ${PRODUCT_INVENTORY_TABLE} search_inventory
          WHERE search_inventory.product_id = p.id
            AND (
              COALESCE(search_inventory.color_name, '') ILIKE $${values.length}
              OR COALESCE(search_inventory.product_code, '') ILIKE $${values.length}
              OR COALESCE(search_inventory.article_number, '') ILIKE $${values.length}
            )
        )
      )`);
    }

    if (pagination.status) {
      values.push(pagination.status);
      clauses.push(`LOWER(COALESCE(p.status, 'active')) = $${values.length}`);
    }

    const category = String(req.query.category || '').trim();

    if (category) {
      values.push(category);
      clauses.push(`(
        LOWER(COALESCE(c.slug, '')) = LOWER($${values.length})
        OR LOWER(COALESCE(c.name, '')) = LOWER($${values.length})
        OR LOWER(COALESCE(c.label, '')) = LOWER($${values.length})
      )`);
    }

    const collection = String(req.query.collection || '').trim();
    if (collection) {
      values.push(collection);
      clauses.push(`(
        LOWER(COALESCE(col.slug, '')) = LOWER($${values.length})
        OR LOWER(COALESCE(col.name, '')) = LOWER($${values.length})
      )`);
    }

    const style = String(req.query.style || '').trim();
    if (style) {
      values.push(style);
      clauses.push(`(
        LOWER(COALESCE(st.slug, '')) = LOWER($${values.length})
        OR LOWER(COALESCE(st.name, '')) = LOWER($${values.length})
      )`);
    }

    const gender = String(req.query.gender || req.query.department || '').trim().toLowerCase();
    if (gender) {
      values.push(gender);
      clauses.push(`LOWER(COALESCE(d.name, '')) = $${values.length}`);
    }

    const productGroup = String(req.query.group || req.query.productGroup || req.query.product_group || '').trim();
    if (productGroup) {
      values.push(productGroup);
      clauses.push(`(
        LOWER(COALESCE(pg.slug, '')) = LOWER($${values.length})
        OR LOWER(COALESCE(pg.name, '')) = LOWER($${values.length})
        OR LOWER(COALESCE(pg.label, '')) = LOWER($${values.length})
      )`);
    }

    const sortSql = pagination.sort === 'price_asc'
      ? 'p.price ASC, p.created_at DESC'
      : pagination.sort === 'price_desc'
        ? 'p.price DESC, p.created_at DESC'
        : pagination.sort === 'sold_count'
          ? 'COALESCE(p.sold_count, 0) DESC, p.created_at DESC'
          : 'p.created_at DESC, p.id DESC';
    const whereSql = `WHERE ${clauses.join(' AND ')}`;
    const result = await productModel.listAdminRows(db, {
      whereSql,
      sortSql,
      values,
      limit: pagination.limit,
      offset: pagination.offset,
      newArrivalWindowDays: NEW_ARRIVAL_WINDOW_DAYS
    });

    return res.json({
      items: result.rows.map(serializeAdminProduct),
      pagination: buildPaginationPayload(pagination, result.total)
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.updateProductStatus = async (req, res) => {
  try {
    const db = getDb(req);
    const status = normalizeActiveStatus(req.body.status);
    const result = await productModel.updateAdminStatus(db, req.params.productId, status);

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    invalidateProductListCache();
    return res.json({
      message: `Product ${status === 'active' ? 'activated' : 'deactivated'} successfully.`,
      product: {
        id: String(result.rows[0].id),
        status: String(result.rows[0].status),
        updatedAt: result.rows[0].updated_at || null
      }
    });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

controller.listProductReviews = async (req, res) => {
  try {
    const db = getDb(req);
    const pagination = parseListQuery(req.query, { limit: 10, maxLimit: 60 });
    const status = String(req.query.status || '').trim().toLowerCase();
    const gender = String(req.query.gender || req.query.department || '').trim().toLowerCase();
    const category = String(req.query.category || '').trim();
    const productGroup = String(req.query.group || req.query.productGroup || req.query.product_group || '').trim();
    const rating = Number.parseInt(req.query.rating, 10);
    const dateRange = String(req.query.dateRange || '').trim().toLowerCase();
    const requestedReviewId = String(req.query.reviewId || req.query.review_id || '').trim();
    const reviewId = isValidUuid(requestedReviewId) ? requestedReviewId : '';
    const result = await reviewModel.listAdmin(db, {
      ...pagination,
      status,
      gender,
      category,
      productGroup,
      rating,
      dateRange,
      reviewId
    });

    return res.json({
      items: result.rows.map(serializeAdminProductReview),
      pagination: buildPaginationPayload(pagination, result.total)
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.updateProductReviewReply = async (req, res) => {
  try {
    const db = getDb(req);
    const reviewId = String(req.params.reviewId || '').trim();

    if (!isValidUuid(reviewId)) {
      return res.status(400).json({
        message: 'Review id is required.'
      });
    }

    const adminReply = normalizeAdminReply(req.body.adminReply || req.body.admin_reply || req.body.reply);
    const updateResult = await reviewModel.updateAdminReply(
      db,
      reviewId,
      adminReply,
      req.authUser && req.authUser.id ? req.authUser.id : null
    );

    if (!updateResult.rowCount) {
      return res.status(404).json({
        message: 'Review not found.'
      });
    }

    const review = await reviewModel.findAdminById(db, reviewId);

    return res.json({
      message: 'Review reply saved successfully.',
      review: serializeAdminProductReview(review)
    });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

controller.deleteProductReviewReply = async (req, res) => {
  try {
    const db = getDb(req);
    const reviewId = String(req.params.reviewId || '').trim();

    if (!isValidUuid(reviewId)) {
      return res.status(400).json({
        message: 'Review id is required.'
      });
    }

    const updateResult = await reviewModel.clearAdminReply(db, reviewId);

    if (!updateResult.rowCount) {
      return res.status(404).json({
        message: 'Review not found.'
      });
    }

    const review = await reviewModel.findAdminById(db, reviewId);

    return res.json({
      message: 'Review reply cleared successfully.',
      review: serializeAdminProductReview(review)
    });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

  return controller;
};
