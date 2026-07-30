// Admin product handlers: full product read/write, relation sync, soft delete checks, and image upload.
module.exports = ({
  PRODUCT_ORDER_HISTORY_DELETE_MESSAGE,
  buildProductPayload,
  clearProductRelationsSignatureCache = () => {},
  invalidateProductListCache = () => {},
  findProductById,
  getDb,
  getUploadBaseUrl,
  hasCompleteProductUpdatePayload,
  isValidUuid,
  removeStoredFile,
  productModel,
  resolveProductReferences,
  sendError,
  syncProductImages,
  syncProductInventorySummary,
  syncProductRelations,
  validateStoredImage
}) => {
  const controller = {};
  const PRODUCT_REFERENCE_CACHE_TTL_MS = 30000;
  const productReferenceCache = new Map();
  const buildProductReferenceCacheKey = product => [
    product.gender,
    product.category,
    product.productGroup || product.product_group || product.productGroupSlug,
    product.collection,
    product.styleName || product.style_name,
    product.fitName || product.fit || product.fit_name
  ].map(value => String(value || '').trim().toLowerCase()).join('|');
  const resolveProductReferencesCached = async (db, product) => {
    const key = buildProductReferenceCacheKey(product);
    const cached = productReferenceCache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const value = await resolveProductReferences(db, product);
    productReferenceCache.set(key, {
      expiresAt: Date.now() + PRODUCT_REFERENCE_CACHE_TTL_MS,
      value
    });

    return value;
  };

controller.readAdminProduct = async (req, res) => {
  try {
    const product = await findProductById(getDb(req), req.params.productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    return res.json(product);
  } catch (error) {
    return sendError(res, error);
  }
};

controller.createProduct = async (req, res) => {
  try {
    const db = getDb(req);
    const product = buildProductPayload(req.body);
    const shouldUseReferenceCache =
      !String(product.collection || '').trim() &&
      !String(product.styleName || product.style_name || '').trim();
    const referencesPromise = shouldUseReferenceCache
      ? resolveProductReferencesCached(db, product)
      : null;
    const client = await db.connect();

    try {
      await client.query('BEGIN');
      const references =
        referencesPromise
          ? await referencesPromise
          : shouldUseReferenceCache
            ? await resolveProductReferencesCached(client, product)
            : await resolveProductReferences(client, product);
      let insertResult = await productModel.createAdminRow(client, product, references, product.slug);

      if (!insertResult.rowCount) {
        const uniqueSlug = await productModel.resolveUniqueSlug(client, product.slug);
        insertResult = await productModel.createAdminRow(client, product, references, uniqueSlug);
      }

      const createdRow = insertResult.rows[0];
      await syncProductRelations(client, createdRow.id, product, { isNew: true });
      await syncProductInventorySummary(client, createdRow.id);
      await client.query('COMMIT');
      invalidateProductListCache();

      return res.status(201).json({
        id: String(createdRow.id),
        message: 'Product created successfully.'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    sendError(res, error);
  }
};

controller.updateProduct = async (req, res) => {
  try {
    const db = getDb(req);
    const existingProduct = hasCompleteProductUpdatePayload(req.body)
      ? await productModel.findAdminUpdateBaseById(db, req.params.productId)
      : await findProductById(db, req.params.productId);

    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const updatedPayload = buildProductPayload(req.body, existingProduct);
    const shouldUseReferenceCache =
      !String(updatedPayload.collection || '').trim() &&
      !String(updatedPayload.styleName || updatedPayload.style_name || '').trim();
    const referencesPromise = shouldUseReferenceCache
      ? resolveProductReferencesCached(db, updatedPayload)
      : null;
    const client = await db.connect();

    try {
      await client.query('BEGIN');
      const uniqueSlugPromise = String(updatedPayload.slug || '').trim().toLowerCase() === String(existingProduct.slug || '').trim().toLowerCase()
        ? Promise.resolve(existingProduct.slug)
        : productModel.resolveUniqueSlug(db, updatedPayload.slug, existingProduct.id);

      const [
        references,
        uniqueSlug
      ] = await Promise.all([
        referencesPromise
          ? referencesPromise
          : shouldUseReferenceCache
            ? resolveProductReferencesCached(client, updatedPayload)
            : resolveProductReferences(client, updatedPayload),
        uniqueSlugPromise
      ]);
      await productModel.updateAdminRow(
        client,
        existingProduct.id,
        updatedPayload,
        references,
        uniqueSlug
      );

      await syncProductRelations(client, existingProduct.id, updatedPayload);
      await syncProductInventorySummary(client, existingProduct.id);
      await client.query('COMMIT');
      invalidateProductListCache();

      return res.json({
        id: String(existingProduct.id),
        message: 'Product updated successfully.'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return sendError(res, error);
  }
};

controller.deleteProduct = async (req, res) => {
  try {
    const db = getDb(req);

    if (!isValidUuid(req.params.productId)) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const outcome = await productModel.deleteAdminProduct(db, req.params.productId);

    if (!outcome.product_exists) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    if (outcome.has_orders) {
      return res.status(409).json({
        message: PRODUCT_ORDER_HISTORY_DELETE_MESSAGE
      });
    }

    invalidateProductListCache();

    return res.json({
      message: 'Product deleted successfully.',
      id: String(outcome.deleted_id)
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.syncProductImages = async (req, res) => {
  try {
    const db = getDb(req);
    const productId = String(req.params.productId || '').trim();

    if (!isValidUuid(productId)) {
      return res.status(400).json({ message: 'Product id is required.' });
    }

    const product = await findProductById(db, productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const client = await db.connect();

    try {
      await client.query('BEGIN');
      await syncProductImages(client, productId, req.body.images || req.body.productImages || req.body.product_images || []);
      await client.query('COMMIT');
      invalidateProductListCache();

      return res.json({
        message: 'Product images updated successfully.',
        product: await findProductById(db, productId)
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return sendError(res, error);
  }
};

controller.uploadProductImage = async (req, res) => {
  let shouldKeepUploadedFile = false;

  try {
    const db = getDb(req);
    const productId = String(req.params.productId || '').trim();

    if (!isValidUuid(productId)) {
      return res.status(400).json({
        message: 'Product id is required.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: 'Product image file is required.'
      });
    }

    if (!(await validateStoredImage(req.file))) {
      return res.status(400).json({
        message: 'Uploaded file content does not match a supported image format.'
      });
    }

    const product = await findProductById(db, productId);

    if (!product) {
      return res.status(404).json({
        message: 'Product not found.'
      });
    }

    const imageUrl = `${getUploadBaseUrl(req)}/uploads/products/${req.file.filename}`;
    const colorName = String(req.body.colorName || req.body.color_name || '').trim();
    const altText = String(req.body.altText || req.body.alt_text || product.name || '').trim();
    const shouldSetPrimary = String(req.body.isPrimary || req.body.is_primary || '').toLowerCase() === 'true';
    const sortOrder = Number.parseInt(req.body.sortOrder || req.body.sort_order || '0', 10) || 0;

    const client = await db.connect();

    try {
      await client.query('BEGIN');

      if (shouldSetPrimary) {
        await productModel.clearPrimaryImage(client, productId, colorName);
      }

      const result = await productModel.insertAdminImage(client, {
        productId,
        colorName,
        imageUrl,
        altText,
        isPrimary: shouldSetPrimary,
        sortOrder
      });

      await client.query('COMMIT');
      clearProductRelationsSignatureCache(productId);
      invalidateProductListCache();
      shouldKeepUploadedFile = true;

      return res.status(201).json({
        image: {
          id: String(result.rows[0].id),
          productId: String(result.rows[0].product_id),
          colorName: String(result.rows[0].color_name || ''),
          imageUrl: String(result.rows[0].image_url || ''),
          altText: String(result.rows[0].alt_text || ''),
          isPrimary: Boolean(result.rows[0].is_primary),
          sortOrder: Number(result.rows[0].sort_order || 0),
          createdAt: result.rows[0].created_at || null
        },
        product: await findProductById(db, productId)
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return sendError(res, error);
  } finally {
    if (req.file && !shouldKeepUploadedFile) {
      await removeStoredFile(req.file.path).catch(() => {});
    }
  }
};

  return controller;
};
