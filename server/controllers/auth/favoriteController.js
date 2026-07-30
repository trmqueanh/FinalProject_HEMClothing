// Favorite handlers: authenticated wishlist IDs and toggle/remove/clear operations.
module.exports = ({
  favoriteModel,
  getDb,
  isValidUuid,
  sendError
}) => {
  const controller = {};

  const readColorVariantId = req =>
    String(
      (req.body && (req.body.colorVariantId || req.body.color_variant_id)) ||
      (req.query && (req.query.colorVariantId || req.query.color_variant_id || req.query.variant)) ||
      ''
    ).trim();

controller.getFavorites = async (req, res) => {
  try {
    const db = getDb(req);

    if (!req.authUser) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }

    return res.json({
      ids: await favoriteModel.listIds(db, req.authUser.id)
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.toggleFavorite = async (req, res) => {
  try {
    const db = getDb(req);

    if (!req.authUser) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }

    const productId = String(req.params.productId || '').trim();
    const colorVariantId = readColorVariantId(req);

    if (!isValidUuid(productId)) {
      return res.status(400).json({
        message: 'Product id is required.'
      });
    }

    if (
      !isValidUuid(colorVariantId) ||
      !(await favoriteModel.isValidColorVariant(db, productId, colorVariantId))
    ) {
      return res.status(400).json({
        message: 'Valid color variant is required.'
      });
    }

    return res.json(await favoriteModel.toggle(
      db,
      req.authUser.id,
      productId,
      colorVariantId
    ));
  } catch (error) {
    return sendError(res, error);
  }
};

controller.removeFavorite = async (req, res) => {
  try {
    const db = getDb(req);

    if (!req.authUser) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }

    const productId = String(req.params.productId || '').trim();
    const colorVariantId = readColorVariantId(req);

    if (!isValidUuid(productId)) {
      return res.status(400).json({
        message: 'Product id is required.'
      });
    }

    if (
      !isValidUuid(colorVariantId) ||
      !(await favoriteModel.isValidColorVariant(db, productId, colorVariantId))
    ) {
      return res.status(400).json({
        message: 'Valid color variant is required.'
      });
    }

    return res.json({
      ids: await favoriteModel.remove(
        db,
        req.authUser.id,
        productId,
        colorVariantId
      )
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.clearFavorites = async (req, res) => {
  try {
    const db = getDb(req);

    if (!req.authUser) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }

    return res.json({
      ids: await favoriteModel.clear(db, req.authUser.id)
    });
  } catch (error) {
    return sendError(res, error);
  }
};

  return controller;
};
