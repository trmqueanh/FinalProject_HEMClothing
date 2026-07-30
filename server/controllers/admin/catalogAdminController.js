// Admin catalog handlers: category and collection listing, create/update, status changes, and soft delete.
module.exports = ({
  buildPaginationPayload,
  catalogModel,
  categoryModel,
  collectionModel,
  getDb,
  invalidateProductListCache = () => {},
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
}) => {
  const controller = {};

controller.listProductGroups = async (req, res) => {
  try {
    const db = getDb(req);
    const result = await catalogModel.listAdminProductGroups(db);

    return res.json({
      items: result.rows.map(serializeAdminProductGroup)
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.listStyles = async (req, res) => {
  try {
    const db = getDb(req);
    const result = await catalogModel.listAdminStyles(db);

    return res.json({
      items: result.rows.map(serializeAdminStyle)
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.listFits = async (req, res) => {
  try {
    const db = getDb(req);
    const result = await catalogModel.listAdminFits(db);

    return res.json({
      items: result.rows.map(serializeAdminFit)
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.listMaterials = async (req, res) => {
  try {
    const db = getDb(req);
    const result = await catalogModel.listAdminMaterials(db);

    return res.json({
      items: result.rows.map(serializeAdminMaterial)
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.listCategories = async (req, res) => {
  try {
    const db = getDb(req);
    const pagination = parseListQuery(req.query, { limit: 10 });
    const gender = String(req.query.gender || req.query.department || '').trim().toLowerCase();
    const productGroup = String(req.query.group || req.query.productGroup || req.query.product_group || '').trim();
    const result = await categoryModel.list(db, {
      ...pagination,
      gender,
      productGroup
    });

    return res.json({
      items: result.rows.map(serializeAdminCategory),
      pagination: buildPaginationPayload(pagination, result.total)
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.listCollections = async (req, res) => {
  try {
    const db = getDb(req);
    const pagination = parseListQuery(req.query, { limit: 10 });
    const result = await collectionModel.list(db, pagination);

    return res.json({
      items: result.rows.map(serializeAdminCollection),
      pagination: buildPaginationPayload(pagination, result.total)
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const normalizeCategoryPayload = body => {
  const name = String(body.name || '').trim();
  const label = String(body.label || name).trim();
  const slug = String(body.slug || slugify(name)).trim();
  const departmentId = String(body.departmentId || body.department_id || '').trim() || null;
  const productGroupId = String(body.productGroupId || body.product_group_id || '').trim() || null;
  const status = String(body.status || 'active').trim().toLowerCase();

  if (!name || !label || !slug) {
    const error = new Error('Category name, label, and slug are required.');
    error.statusCode = 400;
    throw error;
  }

  return { name, label, slug, departmentId, productGroupId, status };
};

controller.readCategory = async (req, res) => {
  try {
    const db = getDb(req);
    const result = await categoryModel.findById(db, req.params.categoryId);

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    return res.json({ category: serializeAdminCategory(result.rows[0]) });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.createCategory = async (req, res) => {
  try {
    const db = getDb(req);
    const payload = normalizeCategoryPayload(req.body);
    const result = await categoryModel.create(db, payload);

    invalidateProductListCache();
    return res.status(201).json({ category: serializeAdminCategory(result.rows[0]) });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

controller.updateCategory = async (req, res) => {
  try {
    const db = getDb(req);
    const payload = normalizeCategoryPayload(req.body);
    const result = await categoryModel.update(db, req.params.categoryId, payload);

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    invalidateProductListCache();
    return res.json({ category: serializeAdminCategory(result.rows[0]) });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

controller.updateCategoryStatus = async (req, res) => {
  try {
    const db = getDb(req);
    const status = normalizeActiveStatus(req.body.status);
    const result = await categoryModel.updateStatus(db, req.params.categoryId, status);

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    invalidateProductListCache();
    return res.json({
      message: `Category ${status === 'active' ? 'activated' : 'deactivated'} successfully.`,
      category: serializeAdminCategory(result.rows[0])
    });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

controller.deleteCategory = async (req, res) => {
  try {
    const db = getDb(req);
    const result = await categoryModel.softDelete(db, req.params.categoryId);

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    invalidateProductListCache();
    return res.json({ message: 'Category deleted successfully.', id: String(result.rows[0].id) });
  } catch (error) {
    return sendError(res, error);
  }
};

const normalizeCollectionPayload = body => {
  const name = String(body.name || '').trim();
  const slug = String(body.slug || slugify(name)).trim();
  const rawDepartments = Array.isArray(body.departments) ? body.departments : [];

  if (!name || !slug) {
    const error = new Error('Collection name and slug are required.');
    error.statusCode = 400;
    throw error;
  }

  const seenDepartments = new Set();
  const departments = rawDepartments.map(item => {
    const departmentId = String(item.departmentId || item.department_id || '').trim();
    const bannerImage = String(item.bannerImage || item.banner_image_url || '').trim();
    const bannerPublicId = String(item.bannerPublicId || item.banner_public_id || '').trim();
    const status = String(item.status || 'active').trim().toLowerCase();

    if (!departmentId || !bannerImage) {
      const error = new Error('Every enabled collection department requires a department and banner image.');
      error.statusCode = 400;
      throw error;
    }

    if (seenDepartments.has(departmentId)) {
      const error = new Error('A collection department can only be configured once.');
      error.statusCode = 400;
      throw error;
    }

    seenDepartments.add(departmentId);
    return {
      departmentId,
      bannerImage,
      bannerPublicId,
      status: status === 'inactive' ? 'inactive' : 'active'
    };
  });

  if (!departments.length) {
    const error = new Error('Enable at least one department for the collection.');
    error.statusCode = 400;
    throw error;
  }

  return {
    name,
    slug,
    bannerImage: departments[0].bannerImage,
    departments,
    status: String(body.status || 'active').trim().toLowerCase()
  };
};

controller.readCollection = async (req, res) => {
  try {
    const db = getDb(req);
    const result = await collectionModel.findById(db, req.params.collectionId);

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Collection not found.' });
    }

    return res.json({ collection: serializeAdminCollection(result.rows[0]) });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.createCollection = async (req, res) => {
  try {
    const db = getDb(req);
    const payload = normalizeCollectionPayload(req.body);
    const result = await collectionModel.create(db, payload);

    invalidateProductListCache();
    return res.status(201).json({ collection: serializeAdminCollection(result.rows[0]) });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

controller.updateCollection = async (req, res) => {
  try {
    const db = getDb(req);
    const payload = normalizeCollectionPayload(req.body);
    const result = await collectionModel.update(db, req.params.collectionId, payload);

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Collection not found.' });
    }

    invalidateProductListCache();
    return res.json({ collection: serializeAdminCollection(result.rows[0]) });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

controller.updateCollectionStatus = async (req, res) => {
  try {
    const db = getDb(req);
    const status = normalizeActiveStatus(req.body.status);
    const result = await collectionModel.updateStatus(db, req.params.collectionId, status);

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Collection not found.' });
    }

    invalidateProductListCache();
    return res.json({
      message: `Collection ${status === 'active' ? 'activated' : 'deactivated'} successfully.`,
      collection: serializeAdminCollection(result.rows[0])
    });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

controller.deleteCollection = async (req, res) => {
  try {
    const db = getDb(req);
    const result = await collectionModel.softDelete(db, req.params.collectionId);

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Collection not found.' });
    }

    invalidateProductListCache();
    return res.json({ message: 'Collection deleted successfully.', id: String(result.rows[0].id) });
  } catch (error) {
    return sendError(res, error);
  }
};

  return controller;
};
