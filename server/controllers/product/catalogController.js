// Public storefront catalog handlers: departments, categories, collections, listings, and product detail.
const { COLOR_FAMILY_OPTIONS, COLOR_FAMILY_SWATCHES, colorFamilyValue, normalizeColorFamily } = require('../../utils/colorFamilies');

module.exports = ({
  catalogModel,
  categoryModel,
  collectionModel,
  PRODUCT_SELECT,
  productModel,
  applySearchFilter,
  buildPaginationPayload,
  buildProductOrderBy,
  buildSqlFilters,
  findProductById,
  getDb,
  hydrateProducts,
  isValidUuid,
  parsePaginationQuery,
  sendError,
  serializeCollection,
  serializeSizeGuide,
  sortProducts
}) => {
  const controller = {};
  const PRODUCT_LIST_CACHE_TTL_MS = Math.max(
    5000,
    Number(process.env.PRODUCT_LIST_CACHE_TTL_MS || 5 * 60 * 1000)
  );
  const productListCache = new Map();
  const productListCachePromises = new Map();
  let productListCacheVersion = 0;
  const normalizeDepartmentName = value => (String(value || '').trim().toLowerCase() === 'men' ? 'men' : 'women');
  const getProductListCache = key => {
    const cached = productListCache.get(key);

    if (!cached || cached.expiresAt <= Date.now()) {
      productListCache.delete(key);
      return null;
    }

    return cached.payload;
  };
  const setProductListCache = (key, payload) => {
    productListCache.set(key, {
      expiresAt: Date.now() + PRODUCT_LIST_CACHE_TTL_MS,
      payload
    });

    return payload;
  };
  const getOrCreateProductListCachePromise = (key, producer) => {
    const existingPromise = productListCachePromises.get(key);

    if (existingPromise) {
      return existingPromise;
    }

    const cacheVersion = productListCacheVersion;
    const promise = Promise.resolve()
      .then(producer)
      .then(payload => cacheVersion === productListCacheVersion
        ? setProductListCache(key, payload)
        : payload)
      .finally(() => {
        if (productListCachePromises.get(key) === promise) {
          productListCachePromises.delete(key);
        }
      });

    productListCachePromises.set(key, promise);
    return promise;
  };
  controller.invalidateProductListCache = () => {
    productListCacheVersion += 1;
    productListCache.clear();
    productListCachePromises.clear();
  };
  const HEEL_HEIGHT_OPTIONS = ['High heel', 'Mid heel', 'Low heel', 'No heel'];
  const GROUP_FILTER_CONFIG = {
    clothing: {
      categoryLabel: 'Category',
      styleLabel: 'Style',
      showCategory: true,
      showSize: true,
      showFit: true,
      showStyle: true,
      showHeelHeight: false
    },
    shoes: {
      categoryLabel: 'Footwear type',
      styleLabel: 'Footwear style',
      showCategory: true,
      showSize: true,
      showFit: false,
      showStyle: true,
      showHeelHeight: true
    },
    accessories: {
      categoryLabel: 'Accessory type',
      styleLabel: 'Accessory style',
      showCategory: true,
      showSize: false,
      showFit: false,
      showStyle: true,
      showHeelHeight: false
    }
  };
  const normalizeProductGroupSlug = value => {
    const slug = String(value || '').trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(GROUP_FILTER_CONFIG, slug) ? slug : '';
  };
  const resolveQueryProductGroup = query =>
    normalizeProductGroupSlug(
      query.productGroup || query.product_group || query.group || query.groupSlug || query.productGroupSlug
    );
  const valueLabelOption = (value, label = value, extra = {}) => ({
    value: String(value || '').trim(),
    label: String(label || value || '').trim(),
    ...extra
  });
  const addOption = (optionsByValue, value, label = value, extra = {}) => {
    const cleanValue = String(value || '').trim();
    const cleanLabel = String(label || value || '').trim();

    if (!cleanValue || !cleanLabel || optionsByValue[cleanValue]) {
      return;
    }

    optionsByValue[cleanValue] = valueLabelOption(cleanValue, cleanLabel, extra);
  };
  const sortedOptions = optionsByValue =>
    Object.values(optionsByValue).sort((left, right) => left.label.localeCompare(right.label));
  const resolveActiveProductGroup = (query, products) => {
    const queryProductGroup = resolveQueryProductGroup(query);

    if (queryProductGroup) {
      return queryProductGroup;
    }

    if (!query.category) {
      return '';
    }

    const productGroups = [
      ...new Set(
        products
          .map(product => normalizeProductGroupSlug(product.productGroupSlug || product.productGroup))
          .filter(Boolean)
      )
    ];

    return productGroups.length === 1 ? productGroups[0] : '';
  };
  const buildAvailableFilters = (products, query = {}) => {
    const activeProductGroup = resolveActiveProductGroup(query, products);
    const groupConfig = activeProductGroup ? GROUP_FILTER_CONFIG[activeProductGroup] : null;
    const categoriesByValue = {};
    const fitsByValue = {};
    const stylesByValue = {};
    const materialsByValue = {};
    const heelHeights = new Set();
    const sizes = new Set();
    const colorsByValue = {};
    const prices = [];

    products.forEach(product => {
      const department = normalizeDepartmentName(product.gender);
      const categoryValue = String(product.categorySlug || product.category || '').trim();
      const categoryLabel = String(product.categoryLabel || product.category || categoryValue).trim();

      if (groupConfig?.showCategory && categoryValue && categoryLabel) {
        addOption(categoriesByValue, categoryValue, categoryLabel, { department });
      }

      const productGroup = String(product.productGroupSlug || product.productGroup || '').trim().toLowerCase();
      if (groupConfig?.showSize && productGroup !== 'accessories') {
        (Array.isArray(product.sizes) ? product.sizes : []).forEach(size => {
          const cleanSize = String(size || '').trim();
          if (cleanSize) sizes.add(cleanSize);
        });
      }

      if (groupConfig?.showFit) {
        addOption(fitsByValue, product.fitSlug || product.fitName || product.fit, product.fitName || product.fit);
      }

      if (groupConfig?.showStyle) {
        addOption(stylesByValue, product.styleSlug || product.styleName, product.styleName);
      }

      if (groupConfig?.showHeelHeight) {
        const heelHeight = String(product.heelHeight || product.heel_height || '').trim();
        if (HEEL_HEIGHT_OPTIONS.includes(heelHeight)) {
          heelHeights.add(heelHeight);
        }
      }

      (Array.isArray(product.materialFilterOptions) ? product.materialFilterOptions : []).forEach(material => {
        addOption(materialsByValue, material.value, material.label);
      });

      const productColorFamilies = new Set();
      (Array.isArray(product.colors) ? product.colors : []).forEach(color => {
        const family = normalizeColorFamily(color && (color.family || color.colorFamily || color.color_family), color && color.name);
        const value = colorFamilyValue(family);

        if (!value) {
          return;
        }

        if (!colorsByValue[value]) {
          colorsByValue[value] = {
            name: family,
            label: family,
            value,
            hex: String(color && color.hex || COLOR_FAMILY_SWATCHES[value] || ''),
            swatch: String(color && color.hex || COLOR_FAMILY_SWATCHES[value] || ''),
            count: 0
          };
        }

        productColorFamilies.add(value);
      });

      productColorFamilies.forEach(value => {
        if (colorsByValue[value]) {
          colorsByValue[value].count += 1;
        }
      });

      const price = Number(product.listingPrice ?? product.listing_price ?? product.price);
      if (Number.isFinite(price)) {
        prices.push(price);
      }
    });

    const filters = {
      productGroup: activeProductGroup,
      labels: {
        category: groupConfig?.categoryLabel || '',
        style: groupConfig?.styleLabel || ''
      },
      sort: [
        valueLabelOption('newest', 'Newest'),
        valueLabelOption('discount-desc', 'Hot Deals'),
        valueLabelOption('price-asc', 'Price low to high'),
        valueLabelOption('price-desc', 'Price high to low'),
        valueLabelOption('name', 'Alphabetical')
      ]
    };

    const categoryOptions = sortedOptions(categoriesByValue);
    const fitOptions = sortedOptions(fitsByValue);
    const styleOptions = sortedOptions(stylesByValue);
    const materialOptions = sortedOptions(materialsByValue);
    const sizeOptions = [...sizes].sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
    const colorOptions = COLOR_FAMILY_OPTIONS
      .map(family => colorsByValue[colorFamilyValue(family)])
      .filter(Boolean);
    const heelHeightOptions = HEEL_HEIGHT_OPTIONS
      .filter(value => heelHeights.has(value))
      .map(value => valueLabelOption(value, value));

    if (categoryOptions.length) filters.categories = categoryOptions;
    if (sizeOptions.length) filters.sizes = sizeOptions;
    if (colorOptions.length) filters.colors = colorOptions;
    if (fitOptions.length) filters.fits = fitOptions;
    if (styleOptions.length) filters.styles = styleOptions;
    if (heelHeightOptions.length) filters.heelHeights = heelHeightOptions;
    if (materialOptions.length) filters.materials = materialOptions;
    if (prices.length) {
      filters.price = {
        min: Math.min(...prices),
        max: Math.max(...prices)
      };
    }

    return filters;
  };

  const buildActiveFilters = (query, products = []) => {
    const productGroup = resolveActiveProductGroup(query, products);

    return {
      q: String(query.q || query.search || '').trim(),
      department: String(query.department || '').trim(),
      productGroup,
      category: String(query.category || '').trim(),
      size: productGroup && productGroup !== 'accessories' ? String(query.size || '').trim() : '',
      color: query.color ? colorFamilyValue(String(query.color)) : '',
      fit: productGroup === 'clothing' ? String(query.fit || '').trim() : '',
      style: productGroup ? String(query.style || '').trim() : '',
      heel_height: productGroup === 'shoes' ? String(query.heel_height || '').trim() : '',
      material: String(query.material || '').trim(),
      price: String(query.price || '').trim(),
      minPrice: String(query.minPrice || '').trim(),
      maxPrice: String(query.maxPrice || '').trim(),
      sort: String(query.sort || '').trim() || 'newest'
    };
  };

controller.listDepartments = async (req, res) => {
  try {
    const db = getDb(req);
    const result = await catalogModel.listDepartmentTreeRows(db);

    const departmentsById = result.rows.reduce((accumulator, row) => {
      const key = String(row.department_id);

      if (!accumulator[key]) {
        accumulator[key] = {
          id: key,
          name: String(row.department_name || ''),
          label: String(row.department_label || row.department_name || ''),
          categories: [],
          groups: []
        };
      }

      if (row.product_group_id && row.category_id) {
        const departmentRecord = accumulator[key];
        const groupId = String(row.product_group_id);
        const categoryId = String(row.category_id);
        const groupPayload = {
          id: groupId,
          name: String(row.product_group_slug || row.product_group_name || ''),
          label: String(row.product_group_label || row.product_group_name || ''),
          slug: String(row.product_group_slug || row.product_group_name || ''),
          sortOrder: Number(row.product_group_sort_order || 0),
          categories: []
        };
        const categoryPayload = {
          id: categoryId,
          name: String(row.category_name || ''),
          label: String(row.category_label || row.category_name || ''),
          slug: String(row.category_slug || ''),
          productGroupId: groupId,
          productGroup: groupPayload.name,
          productGroupLabel: groupPayload.label,
          productGroupSlug: groupPayload.slug,
          sortOrder: Number(row.category_sort_order || 0),
          productCount: Number(row.product_count || 0)
        };
        let groupRecord = departmentRecord.groups.find(group => group.id === groupId);

        if (!groupRecord) {
          groupRecord = groupPayload;
          departmentRecord.groups.push(groupRecord);
        }

        const existingCategory = departmentRecord.categories.find(category => category.id === categoryId);
        const existingGroupCategory = groupRecord.categories.find(category => category.id === categoryId);

        if (existingCategory) {
          Object.assign(existingCategory, categoryPayload);
        } else {
          departmentRecord.categories.push(categoryPayload);
        }

        if (existingGroupCategory) {
          Object.assign(existingGroupCategory, categoryPayload);
        } else {
          groupRecord.categories.push(categoryPayload);
        }
      }

      return accumulator;
    }, {});

    return res.json(
      Object.values(departmentsById).map(department => ({
        ...department,
        categories: [...department.categories].sort((left, right) =>
          (left.label || left.name).localeCompare(right.label || right.name)
        ),
        groups: [...department.groups]
          .sort((left, right) => (left.sortOrder - right.sortOrder) || left.label.localeCompare(right.label))
          .map(group => ({
            ...group,
            categories: [...group.categories].sort(
              (left, right) => (left.sortOrder - right.sortOrder) || left.label.localeCompare(right.label)
            )
          }))
      }))
    );
  } catch (error) {
    return sendError(res, error);
  }
};

controller.listLandingCollections = async (req, res) => {
  try {
    const db = getDb(req);
    const result = await collectionModel.listLanding(db);

    return res.json(result.rows.map(serializeCollection));
  } catch (error) {
    return sendError(res, error);
  }
};

  const loadProductListPayload = async (db, query = {}) => {
    const pagination = parsePaginationQuery(query || {});
    const { whereSql, values } = buildSqlFilters(query, {
      activeOnly: true,
      includeDeleted: false
    });
    const orderBy = buildProductOrderBy(query);

    const resultPromise = productModel.listPublicRows(db, {
      selectSql: PRODUCT_SELECT,
      whereSql,
      orderBy,
      values,
      limit: pagination && pagination.limit,
      offset: pagination && pagination.offset
    });
    const totalPromise = pagination
      ? productModel.countPublicRows(db, { whereSql, values })
      : null;
    const result = await resultPromise;

    const products = await hydrateProducts(db, result.rows);
    const sortedProducts = sortProducts(applySearchFilter(products, query), query);

    if (!pagination) {
      return sortedProducts;
    }

    const totalResult = await totalPromise;

    return {
      items: sortedProducts,
      pagination: buildPaginationPayload(pagination, totalResult.rows[0].total)
    };
  };

controller.listAllProducts = async (req, res) => {
  try {
    const db = getDb(req);
    const cacheKey = `products:${req.originalUrl || JSON.stringify(req.query || {})}`;
    const cachedProducts = getProductListCache(cacheKey);

    if (cachedProducts) {
      return res.json(cachedProducts);
    }

    const payload = await getOrCreateProductListCachePromise(cacheKey, () =>
      loadProductListPayload(db, req.query || {})
    );

    return res.json(payload);
  } catch (error) {
    return sendError(res, error);
  }
};

controller.warmProductListCache = async db => {
  const cacheKey = 'products:/products';

  if (getProductListCache(cacheKey)) {
    return getProductListCache(cacheKey);
  }

  return getOrCreateProductListCachePromise(cacheKey, () => loadProductListPayload(db, {}));
};

controller.searchProducts = async (req, res) => {
  try {
    const db = getDb(req);
    const query = req.query || {};
    const { whereSql, values } = buildSqlFilters(query, {
      activeOnly: true,
      includeDeleted: false
    });
    const orderBy = buildProductOrderBy(query);
    const result = await productModel.listPublicRows(db, {
      selectSql: PRODUCT_SELECT,
      whereSql,
      orderBy,
      values
    });
    const products = sortProducts(await hydrateProducts(db, result.rows), query);

    return res.json({
      products,
      totalCount: products.length,
      availableFilters: buildAvailableFilters(products, query),
      activeFilters: buildActiveFilters(query, products)
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.listMaterials = async (req, res) => {
  try {
    const db = getDb(req);
    const query = req.query || {};
    const productGroup = query.productGroup || query.product_group || query.group || query.groupSlug || query.productGroupSlug;
    const result = await catalogModel.listPublicMaterials(db, {
      productGroup: String(productGroup || '').trim(),
      department: String(query.department || '').trim()
    });

    return res.json({
      items: result.rows.map(row => ({
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
        sortOrder: Number(row.sort_order || 0)
      }))
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.listCollections = async (req, res) => {
  try {
    const db = getDb(req);
    const result = await collectionModel.listPublic(db);

    res.json(result.rows.map(serializeCollection));
  } catch (error) {
    sendError(res, error);
  }
};

controller.listCategories = async (req, res) => {
  try {
    const db = getDb(req);
    const result = await categoryModel.listPublic(db);

    res.json(
      result.rows.map(item => ({
        id: String(item.id),
        name: item.name,
        label: item.label,
        slug: item.slug,
        departmentId: String(item.department_id),
        departmentName: item.department_name,
        departmentLabel: item.department_label,
        productGroupId: item.product_group_id ? String(item.product_group_id) : '',
        productGroup: String(item.product_group_label || item.product_group_name || ''),
        productGroupLabel: String(item.product_group_label || item.product_group_name || ''),
        productGroupSlug: String(item.product_group_slug || ''),
        productCount: Number(item.product_count || 0),
        collections: Array.isArray(item.collections) ? item.collections.filter(Boolean) : [],
        description: `${item.product_count} products in ${item.label || item.name}.`
      }))
    );
  } catch (error) {
    sendError(res, error);
  }
};

controller.getCategorySizeGuide = async (req, res) => {
  try {
    const db = getDb(req);
    const categoryId = String(req.params.categoryId || '').trim();

    if (!isValidUuid(categoryId)) {
      return res.status(400).json({
        message: 'Category id is required.'
      });
    }

    const result = await catalogModel.findCategorySizeGuide(db, categoryId);

    if (!result.rowCount) {
      return res.status(404).json({
        message: 'Size guide is not available for this category.'
      });
    }

    return res.json(serializeSizeGuide(result.rows[0]));
  } catch (error) {
    return sendError(res, error);
  }
};

controller.readProduct = async (req, res) => {
  try {
    const db = getDb(req);
    const product = await findProductById(db, req.params.productId, { activeOnly: true });

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    return res.json(product);
  } catch (error) {
    return sendError(res, error);
  }
};

  return controller;
};
