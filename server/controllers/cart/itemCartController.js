// Cart item handlers: validate requests and delegate persistence to CartModel.
module.exports = ({
  cartModel,
  ensureCustomerAccount,
  getDb,
  isValidUuid,
  mapCartRows,
  normalizeInteger,
  sendError
}) => {
  const controller = {};

controller.addCartItem = async (req, res) => {
  try {
    ensureCustomerAccount(req);
    const db = getDb(req);
    const productId = String(req.body.productId || '').trim();
    const quantity = normalizeInteger(req.body.quantity, 1);
    const sizeLabel = String(req.body.size || req.body.sizeLabel || 'One Size').trim() || 'One Size';
    const colorName = String(req.body.color || req.body.colorName || 'Default').trim() || 'Default';
    const colorVariantId = String(req.body.colorVariantId || req.body.color_variant_id || '').trim();

    if (!isValidUuid(productId)) {
      return res.status(400).json({
        message: 'Product id is required.'
      });
    }

    if (colorVariantId && !isValidUuid(colorVariantId)) {
      return res.status(400).json({
        message: 'Color variant id is invalid.'
      });
    }

    const result = await cartModel.addItem(db, req.authUser.id, {
      productId,
      quantity,
      sizeLabel,
      colorName,
      colorVariantId: colorVariantId || null
    });

    if (!result.productExists) {
      return res.status(404).json({
        message: 'Product not found.'
      });
    }

    if (result.availableInventory <= 0) {
      return res.status(409).json({
        message: 'This product is out of stock.'
      });
    }

    if (!result.changed) {
      return res.status(409).json({
        message: `Only ${result.availableInventory} item(s) are available in stock.`
      });
    }

    return res.status(201).json(mapCartRows(result.rows));
  } catch (error) {
    return sendError(res, error, 400);
  }
};

controller.updateCartItem = async (req, res) => {
  try {
    ensureCustomerAccount(req);
    const db = getDb(req);
    const cartItemId = String(req.params.cartItemId || '').trim();
    const quantity = Number.parseInt(req.body.quantity, 10);

    if (!isValidUuid(cartItemId)) {
      return res.status(400).json({
        message: 'Cart item id is required.'
      });
    }

    const result = await cartModel.updateItem(
      db,
      req.authUser.id,
      cartItemId,
      Number.isFinite(quantity) ? quantity : 0
    );

    if (!result.itemExists) {
      return res.status(404).json({
        message: 'Cart item not found.'
      });
    }

    if (!result.changed) {
      return res.status(409).json({
        message: `Only ${result.availableInventory} item(s) are available in stock.`
      });
    }

    return res.json(mapCartRows(result.rows));
  } catch (error) {
    return sendError(res, error, 400);
  }
};

controller.removeCartItem = async (req, res) => {
  try {
    ensureCustomerAccount(req);
    const db = getDb(req);
    const cartItemId = String(req.params.cartItemId || '').trim();

    if (!isValidUuid(cartItemId)) {
      return res.status(400).json({
        message: 'Cart item id is required.'
      });
    }

    const result = await cartModel.removeItem(db, req.authUser.id, cartItemId);

    if (!result.removed) {
      return res.status(404).json({
        message: 'Cart item not found.'
      });
    }

    return res.json(mapCartRows(result.rows));
  } catch (error) {
    return sendError(res, error, 400);
  }
};

controller.clearCart = async (req, res) => {
  try {
    ensureCustomerAccount(req);
    const db = getDb(req);
    const cart = await cartModel.clear(db, req.authUser.id);

    return res.json({
      id: String(cart.id),
      items: []
    });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

  return controller;
};
