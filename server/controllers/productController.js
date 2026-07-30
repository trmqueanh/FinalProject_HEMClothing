const { isValidUuid } = require('../utils/authUtils');
const { syncProductInventorySummary } = require('../utils/inventoryUtils');
const productModel = require('../models/productModel');
const { slugify, buildProductPayload, serializeProduct } = productModel;
const catalogModel = require('../models/catalogModel');
const categoryModel = require('../models/categoryModel');
const collectionModel = require('../models/collectionModel');
const { removeStoredFile, validateStoredImage } = require('../services/fileStorageService');
const { createErrorResponder } = require('../utils/http');
const { buildPaginationPayload, parseOptionalPagination } = require('../utils/pagination');
const { colorFamilyValue, defaultHexForColorFamily, isValidColorHex, normalizeColorFamily } = require('../utils/colorFamilies');
const { generateProductCode, normalizeProductCode } = require('../utils/productCodes');
const {
  listingPriceSql,
  salePricingExistsSql
} = require('../utils/pricingResolver');
const createCatalogController = require('./product/catalogController');
const createAdminProductController = require('./product/adminProductController');

// Product controller root: normalize shared product behavior, then wire storefront and admin controllers.
const PRODUCT_TABLE = 'products';
const PRODUCT_INVENTORY_TABLE = 'product_inventory';
const PRODUCT_COLOR_VARIANT_TABLE = 'product_color_variants';
const PRODUCT_IMAGE_TABLE = 'product_images';
const CATEGORY_TABLE = 'categories';
const PRODUCT_GROUP_TABLE = 'product_groups';
const DEPARTMENT_TABLE = 'departments';
const COLLECTION_TABLE = 'collections';
const STYLE_TABLE = 'styles';
const FIT_TABLE = 'fits';
const MATERIAL_TABLE = 'materials';
const ORDER_TABLE = 'orders';
const ORDER_ITEM_TABLE = 'order_items';
const PRODUCT_REVIEW_TABLE = 'product_reviews';
const NEW_ARRIVAL_WINDOW_DAYS = 60;
const MATERIAL_INFORMATION_TYPE = 'material_information';
const DEFAULT_MATERIAL_INFORMATION_TITLE = 'ADDITIONAL MATERIAL INFORMATION';
const PRODUCT_LISTING_PRICE_SQL = listingPriceSql('p', PRODUCT_COLOR_VARIANT_TABLE);
const PRODUCT_HAS_SALE_PRICING_SQL = salePricingExistsSql('p', PRODUCT_COLOR_VARIANT_TABLE);

const sendError = createErrorResponder('Unexpected server error.');

const getDb = req => req.app.locals.db;

const parsePaginationQuery = query =>
  parseOptionalPagination(query, { defaultLimit: 24, maxLimit: 60 });

const serializeCollection = item => ({
  type: 'collection',
  id: String(item.id || ''),
  name: String(item.name || ''),
  label: String(item.name || ''),
  slug: String(item.slug || ''),
  bannerImage: String(item.banner_image || ''),
  departments: (Array.isArray(item.departments) ? item.departments : []).map(department => ({
    departmentId: String(department.departmentId || department.department_id || ''),
    departmentName: String(department.departmentName || department.department_name || ''),
    departmentLabel: String(department.departmentLabel || department.department_label || ''),
    bannerImage: String(department.bannerImage || department.banner_image_url || ''),
    bannerPublicId: String(department.bannerPublicId || department.banner_public_id || ''),
    status: String(department.status || 'active')
  })),
  status: String(item.status || 'active'),
  description: `${item.name} collection from PostgreSQL.`,
  accent: '#1f2430',
  base: '#efe8df',
  productCount: Number(item.product_count || 0),
  createdAt: item.created_at || null
});

const normalizeSizeGuideData = value => {
  let data = value && typeof value === 'object' ? value : {};

  if (typeof value === 'string') {
    try {
      data = JSON.parse(value);
    } catch (_error) {
      data = {};
    }
  }

  return {
    columns: Array.isArray(data.columns) ? data.columns.map(column => String(column || '')) : [],
    rows: Array.isArray(data.rows)
      ? data.rows.map(row => (Array.isArray(row) ? row.map(cell => String(cell || '')) : []))
      : []
  };
};

const serializeSizeGuide = row => ({
  id: String(row.id || ''),
  categoryId: String(row.category_id || ''),
  title: String(row.title || ''),
  unit: String(row.unit || 'cm'),
  guideData: normalizeSizeGuideData(row.guide_data),
  createdAt: row.created_at || null,
  updatedAt: row.updated_at || null
});

const PRODUCT_SELECT = `
  SELECT
    p.*,
    c.id AS category_id,
    c.name AS category_name,
    c.label AS category_label,
    c.slug AS category_slug,
    pg.id AS product_group_id,
    pg.name AS product_group_name,
    pg.label AS product_group_label,
    pg.slug AS product_group_slug,
    pg.sort_order AS product_group_sort_order,
    d.id AS department_id,
    d.name AS department_name,
    d.label AS department_label,
    col.id AS collection_id,
    col.name AS collection_name,
    col.slug AS collection_slug,
    st.id AS style_id,
    st.name AS style_name,
    st.slug AS style_slug,
    f.id AS fit_id,
    f.name AS fit_name,
    f.slug AS fit_slug,
    COALESCE(order_stats.ordered_quantity, 0)::int AS ordered_quantity,
    COALESCE(review_stats.average_rating, 0)::numeric(3,2) AS approved_review_rating,
    COALESCE(review_stats.review_count, 0)::int AS approved_review_count,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', pi.id,
          'product_id', pi.product_id,
          'color_variant_id', pi.color_variant_id,
          'color_name', pi.color_name,
          'color_hex', pi.color_hex,
          'color_family', pcv.color_family,
          'sale_price', pcv.sale_price,
          'product_code', pi.product_code,
          'article_number', pi.article_number,
          'size_label', pi.size_label,
          'stock_quantity', pi.stock_quantity,
          'reserved_quantity', pi.reserved_quantity,
          'sold_quantity', pi.sold_quantity,
          'created_at', pi.created_at,
          'updated_at', pi.updated_at
        )
        ORDER BY pi.created_at, pi.id
      )
      FROM ${PRODUCT_INVENTORY_TABLE} pi
      LEFT JOIN ${PRODUCT_COLOR_VARIANT_TABLE} pcv ON pcv.id = pi.color_variant_id AND pcv.deleted_at IS NULL
      WHERE pi.product_id = p.id
    ), '[]'::jsonb) AS inventory_items_json,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', image.id,
          'product_id', image.product_id,
          'color_variant_id', image.color_variant_id,
          'color_name', image.color_name,
          'image_url', image.image_url,
          'alt_text', image.alt_text,
          'is_primary', image.is_primary,
          'sort_order', image.sort_order,
          'created_at', image.created_at
        )
        ORDER BY image.is_primary DESC, image.sort_order, image.created_at, image.id
      )
      FROM ${PRODUCT_IMAGE_TABLE} image
      WHERE image.product_id = p.id
    ), '[]'::jsonb) AS product_images_json,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', material.id,
          'product_id', material.product_id,
          'material_id', material.material_id,
          'material_slug', master_material.slug,
          'part_name', material.part_name,
          'material_name', material.material_name,
          'material_percent', material.material_percent,
          'sort_order', material.sort_order
        )
        ORDER BY material.sort_order, material.id
      )
      FROM product_materials material
      LEFT JOIN ${MATERIAL_TABLE} master_material ON master_material.id = material.material_id
      WHERE material.product_id = p.id
    ), '[]'::jsonb) AS product_materials_json,
    COALESCE((
      SELECT jsonb_build_object(
        'product_id', material_info.product_id,
        'title', COALESCE(NULLIF(material_info.title, ''), '${DEFAULT_MATERIAL_INFORMATION_TITLE}'),
        'content', material_info.highlight_text,
        'sort_order', material_info.sort_order
      )
      FROM product_highlights material_info
      WHERE material_info.product_id = p.id
        AND material_info.highlight_type = '${MATERIAL_INFORMATION_TYPE}'
      ORDER BY material_info.sort_order, material_info.id
      LIMIT 1
    ), '{}'::jsonb) AS product_material_information_json
  FROM ${PRODUCT_TABLE} p
  LEFT JOIN ${CATEGORY_TABLE} c ON c.id = p.category_id
  LEFT JOIN ${PRODUCT_GROUP_TABLE} pg ON pg.id = COALESCE(p.product_group_id, c.product_group_id)
  LEFT JOIN ${DEPARTMENT_TABLE} d ON d.id = COALESCE(p.department_id, c.department_id)
  LEFT JOIN ${COLLECTION_TABLE} col ON col.id = p.collection_id
  LEFT JOIN ${STYLE_TABLE} st ON st.id = p.style_id
  LEFT JOIN ${FIT_TABLE} f ON f.id = p.fit_id
  LEFT JOIN (
    SELECT
      oi.product_id,
      SUM(oi.quantity)::int AS ordered_quantity
    FROM ${ORDER_ITEM_TABLE} oi
    JOIN ${ORDER_TABLE} o ON o.id = oi.order_id
    WHERE o.order_status = 'completed'
    GROUP BY oi.product_id
  ) order_stats ON order_stats.product_id = p.id
  LEFT JOIN (
    SELECT
      product_id,
      AVG(rating)::numeric(3,2) AS average_rating,
      COUNT(*)::int AS review_count
    FROM ${PRODUCT_REVIEW_TABLE}
    WHERE is_approved = true
    GROUP BY product_id
  ) review_stats ON review_stats.product_id = p.id
`;

const parsePriceRangeFilter = value => {
  const price = String(value || '').trim().toLowerCase();

  if (!price) {
    return {};
  }

  if (price.startsWith('under-')) {
    const max = Number(price.slice('under-'.length));
    return Number.isFinite(max) ? { max } : {};
  }

  if (price.startsWith('over-')) {
    const min = Number(price.slice('over-'.length));
    return Number.isFinite(min) ? { min } : {};
  }

  const [minRaw, maxRaw] = price.split('-');
  const min = minRaw === '' ? Number.NaN : Number(minRaw);
  const max = maxRaw === '' ? Number.NaN : Number(maxRaw);

  return {
    ...(Number.isFinite(min) ? { min } : {}),
    ...(Number.isFinite(max) ? { max } : {})
  };
};

const buildSqlFilters = (query, options = {}) => {
  const clauses = [];
  const values = [];

  if (!options.includeDeleted) {
    clauses.push("(to_jsonb(p)->>'deleted_at') IS NULL");
  }

  if (options.activeOnly) {
    clauses.push("LOWER(COALESCE(p.status, 'active')) = 'active'");
  }

  if (query.category) {
    values.push(String(query.category).trim());
    clauses.push(`
      p.category_id IN (
        SELECT selected.id
        FROM ${CATEGORY_TABLE} selected
        WHERE LOWER(selected.name) = LOWER($${values.length})
          OR LOWER(COALESCE(selected.label, '')) = LOWER($${values.length})
          OR LOWER(COALESCE(selected.slug, '')) = LOWER($${values.length})
      )
    `);
  }

  const productGroup = query.productGroup || query.product_group || query.group || query.groupSlug || query.productGroupSlug;
  const normalizedProductGroup = String(productGroup || '').trim().toLowerCase();

  if (productGroup) {
    values.push(String(productGroup).trim());
    clauses.push(`
      (
        LOWER(COALESCE(pg.name, '')) = LOWER($${values.length})
        OR LOWER(COALESCE(pg.label, '')) = LOWER($${values.length})
        OR LOWER(COALESCE(pg.slug, '')) = LOWER($${values.length})
      )
    `);
  }

  if (query.department) {
    values.push(String(query.department).trim());
    clauses.push(`(LOWER(d.name) = LOWER($${values.length}) OR LOWER(COALESCE(d.label, '')) = LOWER($${values.length}))`);
  }

  if (query.collection) {
    values.push(String(query.collection).trim());
    clauses.push(`
      (
        LOWER(COALESCE(col.name, '')) = LOWER($${values.length})
        OR LOWER(COALESCE(col.slug, '')) = LOWER($${values.length})
        OR LOWER(COALESCE(st.name, '')) = LOWER($${values.length})
        OR LOWER(COALESCE(st.slug, '')) = LOWER($${values.length})
      )
    `);
  }

  if (query.fit && (!normalizedProductGroup || normalizedProductGroup === 'clothing')) {
    values.push(String(query.fit).trim());
    clauses.push(`
      (
        LOWER(COALESCE((SELECT fit.name FROM ${FIT_TABLE} fit WHERE fit.id = p.fit_id), p.fit, '')) = LOWER($${values.length})
        OR LOWER(COALESCE((SELECT fit.slug FROM ${FIT_TABLE} fit WHERE fit.id = p.fit_id), '')) = LOWER($${values.length})
      )
    `);
  }

  if (query.style) {
    values.push(String(query.style).trim());
    clauses.push(`
      (
        LOWER(COALESCE(st.name, '')) = LOWER($${values.length})
        OR LOWER(COALESCE(st.slug, '')) = LOWER($${values.length})
      )
    `);
  }

  if (query.heel_height && (!normalizedProductGroup || normalizedProductGroup === 'shoes')) {
    values.push(String(query.heel_height).trim());
    clauses.push(`LOWER(COALESCE(p.heel_height, '')) = LOWER($${values.length})`);
  }

  if (query.material) {
    values.push(String(query.material).trim());
    clauses.push(`EXISTS (
      SELECT 1
      FROM product_materials material_filter
      LEFT JOIN ${MATERIAL_TABLE} material_master ON material_master.id = material_filter.material_id
      WHERE material_filter.product_id = p.id
        AND (
          LOWER(COALESCE(material_master.slug, '')) = LOWER($${values.length})
          OR LOWER(COALESCE(material_master.name, '')) = LOWER($${values.length})
          OR LOWER(COALESCE(material_filter.material_name, '')) = LOWER($${values.length})
        )
    )`);
  }

  const priceRange = parsePriceRangeFilter(query.price);
  const minPrice = Number(query.minPrice ?? priceRange.min);
  const maxPrice = Number(query.maxPrice ?? priceRange.max);

  if (Number.isFinite(minPrice)) {
    values.push(minPrice);
    clauses.push(`(${PRODUCT_LISTING_PRICE_SQL}) >= $${values.length}`);
  }

  if (Number.isFinite(maxPrice)) {
    values.push(maxPrice);
    clauses.push(`(${PRODUCT_LISTING_PRICE_SQL}) <= $${values.length}`);
  }

  if (query.size && normalizedProductGroup !== 'accessories') {
    values.push(String(query.size).trim());
    clauses.push(`EXISTS (
      SELECT 1
      FROM ${PRODUCT_INVENTORY_TABLE} size_filter
      WHERE size_filter.product_id = p.id
        AND LOWER(COALESCE(size_filter.size_label, '')) = LOWER($${values.length})
    )`);
  }

  if (query.color) {
    const rawColor = String(query.color).trim();
    const family = normalizeColorFamily(rawColor);
    values.push(family, rawColor);
    clauses.push(`EXISTS (
      SELECT 1
      FROM ${PRODUCT_COLOR_VARIANT_TABLE} color_filter
      WHERE color_filter.product_id = p.id
        AND color_filter.deleted_at IS NULL
        AND (
          LOWER(COALESCE(color_filter.color_family, '')) = LOWER($${values.length - 1})
          OR LOWER(COALESCE(color_filter.color_name, '')) = LOWER($${values.length})
        )
    )`);
  }

  if (query.sale === 'true') {
    clauses.push(PRODUCT_HAS_SALE_PRICING_SQL);
  }

  if (query.newArrival === 'true' || query.new_arrival === 'true') {
    clauses.push(`p.created_at >= now() - (${NEW_ARRIVAL_WINDOW_DAYS} * interval '1 day')`);
  }

  if (query.bestSeller === 'true' || query.best_seller === 'true' || query.bestseller === 'true') {
    clauses.push('COALESCE(order_stats.ordered_quantity, p.sold_count, 0) > 0');
  }

  if (query.status) {
    values.push(String(query.status).trim().toLowerCase());
    clauses.push(`LOWER(COALESCE(p.status, 'active')) = LOWER($${values.length})`);
  }

  const searchTerm = String(query.q || query.search || '').trim();

  if (searchTerm) {
    values.push(`%${searchTerm}%`);
    clauses.push(`(
      p.name ILIKE $${values.length}
      OR p.slug ILIKE $${values.length}
      OR COALESCE(p.fit, '') ILIKE $${values.length}
      OR COALESCE(c.name, '') ILIKE $${values.length}
      OR COALESCE(c.label, '') ILIKE $${values.length}
      OR COALESCE(pg.name, '') ILIKE $${values.length}
      OR COALESCE(pg.label, '') ILIKE $${values.length}
      OR COALESCE(col.name, '') ILIKE $${values.length}
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

  return {
    whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    values
  };
};

const buildProductOrderBy = query => {
  const sort = String(query.sort || '').trim().toLowerCase();

  if (sort === 'new_arrival' || sort === 'new') {
    return 'p.created_at DESC, p.id DESC';
  }

  if (sort === 'sold_count' || sort === 'best') {
    return 'COALESCE(order_stats.ordered_quantity, 0) DESC, p.created_at DESC, p.id DESC';
  }

  if (sort === 'price_asc' || sort === 'price-asc') {
    return `(${PRODUCT_LISTING_PRICE_SQL}) ASC, p.created_at DESC, p.id DESC`;
  }

  if (sort === 'price_desc' || sort === 'price-desc') {
    return `(${PRODUCT_LISTING_PRICE_SQL}) DESC, p.created_at DESC, p.id DESC`;
  }

  return 'p.created_at DESC, p.id DESC';
};

const applySearchFilter = (products, query) => {
  const searchTerm = String(query.q || '').trim().toLowerCase();

  if (!searchTerm) {
    return products;
  }

  return products.filter(product =>
    [
      product.name,
      product.category,
      product.collection,
      product.styleName,
      product.description,
      product.fit,
      ...(Array.isArray(product.colors)
        ? product.colors.flatMap(color => [color.name, color.productCode, color.articleNumber])
        : []),
      ...(Array.isArray(product.inventoryItems)
        ? product.inventoryItems.flatMap(item => [item.colorName, item.productCode, item.articleNumber])
        : [])
    ]
      .join(' ')
      .toLowerCase()
      .includes(searchTerm)
  );
};

const sortProducts = (products, query) => {
  const sort = String(query.sort || '').trim();

  if (!sort) {
    return products;
  }

  return [...products].sort((left, right) => {
    if (sort === 'new_arrival' || sort === 'new') {
      return Number(right.newArrival || 0) - Number(left.newArrival || 0);
    }

    if (sort === 'sold_count' || sort === 'best') {
      return Number(right.soldCount || 0) - Number(left.soldCount || 0);
    }

    if (sort === 'price_asc' || sort === 'price-asc') {
      return Number(left.listingPrice ?? left.listing_price ?? left.price ?? 0) -
        Number(right.listingPrice ?? right.listing_price ?? right.price ?? 0);
    }

    if (sort === 'price_desc' || sort === 'price-desc') {
      return Number(right.listingPrice ?? right.listing_price ?? right.price ?? 0) -
        Number(left.listingPrice ?? left.listing_price ?? left.price ?? 0);
    }

    return 0;
  });
};

const groupByProductId = (rows, fieldName, mapper = row => row[fieldName]) =>
  rows.reduce((accumulator, row) => {
    const key = String(row.product_id);

    if (!accumulator[key]) {
      accumulator[key] = [];
    }

    accumulator[key].push(mapper(row));
    return accumulator;
  }, {});

const normalizeMaterialInformationRow = row => {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const content = row.content ?? row.highlight_text ?? '';

  if (content === null || content === undefined || String(content).trim() === '') {
    return null;
  }

  return {
    title: String(row.title || DEFAULT_MATERIAL_INFORMATION_TITLE).trim() || DEFAULT_MATERIAL_INFORMATION_TITLE,
    content: String(content)
  };
};

const groupMaterialInformationByProductId = rows =>
  (Array.isArray(rows) ? rows : []).reduce((accumulator, row) => {
    const key = String(row.product_id || '');
    const materialInformation = normalizeMaterialInformationRow(row);

    if (key && materialInformation && !accumulator[key]) {
      accumulator[key] = materialInformation;
    }

    return accumulator;
  }, {});

const MATERIAL_PART_ORDER = ['Main', 'Shell', 'Lining', 'Upper', 'Sole', 'Trim', 'Coating', 'Base fabric', 'Frame', 'Temple', 'Lens'];

const normalizeMaterialPartName = value => {
  const cleanValue = String(value || 'Main').trim();
  return MATERIAL_PART_ORDER.includes(cleanValue) ? cleanValue : 'Main';
};

const formatMaterialPercent = value => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return Number.isInteger(numericValue) ? numericValue : Number(numericValue.toFixed(2));
};

const buildMaterialPayload = rows => {
  const groupsByPart = new Map();
  const filterValuesByValue = new Map();
  const filterOptionsByValue = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row, index) => {
    const name = String(row.material_name || row.name || '').trim();

    if (!name) {
      return;
    }

    const partName = normalizeMaterialPartName(row.part_name);
    const materialId = row.material_id ? String(row.material_id) : '';
    const slug = String(row.material_slug || row.slug || '').trim();
    const material = {
      material_id: materialId,
      materialId,
      name,
      percent: formatMaterialPercent(row.material_percent),
      sortOrder: Number(row.sort_order ?? index) || 0
    };

    if (!groupsByPart.has(partName)) {
      groupsByPart.set(partName, {
        part_name: partName,
        partName,
        materials: []
      });
    }

    groupsByPart.get(partName).materials.push(material);

    const filterValue = slug || name;
    const filterKey = filterValue.toLowerCase();
    if (!filterValuesByValue.has(filterKey)) {
      filterValuesByValue.set(filterKey, filterValue);
      filterOptionsByValue.set(filterKey, {
        value: filterValue,
        label: name
      });
    }
  });

  return {
    materials: [...groupsByPart.values()]
      .sort((left, right) => MATERIAL_PART_ORDER.indexOf(left.part_name) - MATERIAL_PART_ORDER.indexOf(right.part_name))
      .map(group => ({
        ...group,
        materials: [...group.materials].sort((left, right) => left.sortOrder - right.sortOrder)
      })),
    materialFilterValues: [...filterValuesByValue.values()],
    materialFilterOptions: [...filterOptionsByValue.values()]
  };
};

const hydrateProducts = async (db, productRows) => {
  if (!Array.isArray(productRows) || !productRows.length) {
    return [];
  }

  const hasEmbeddedRelations = productRows.every(row =>
    Array.isArray(row.inventory_items_json) &&
    Array.isArray(row.product_images_json) &&
    Array.isArray(row.product_materials_json) &&
    row.product_material_information_json !== undefined
  );
  let inventoryRows;
  let imageRows;
  let materialRows;
  let materialInformationRows;

  if (hasEmbeddedRelations) {
    inventoryRows = productRows.flatMap(row => row.inventory_items_json);
    imageRows = productRows.flatMap(row => row.product_images_json);
    materialRows = productRows.flatMap(row => row.product_materials_json);
    materialInformationRows = productRows
      .map(row => ({
        product_id: row.id,
        ...(row.product_material_information_json || {})
      }))
      .filter(row => normalizeMaterialInformationRow(row));
  } else {
    const productIds = productRows.map(row => row.id);
    const relations = await productModel.loadPublicRelations(db, productIds, {
      materialInformationTitle: DEFAULT_MATERIAL_INFORMATION_TITLE,
      materialInformationType: MATERIAL_INFORMATION_TYPE
    });

    inventoryRows = relations.inventoryRows;
    imageRows = relations.imageRows;
    materialRows = relations.materialRows;
    materialInformationRows = relations.materialInformationRows;
  }

  const inventoryItemsByProductId = groupByProductId(inventoryRows, 'id', row => ({
    id: String(row.id),
    colorName: String(row.color_name || 'Default'),
    colorHex: String(row.color_hex || ''),
    colorFamily: normalizeColorFamily(row.color_family, row.color_name),
    color_family: normalizeColorFamily(row.color_family, row.color_name),
    colorVariantId: row.color_variant_id ? String(row.color_variant_id) : '',
    productCode: String(row.product_code || row.article_number || ''),
    articleNumber: String(row.article_number || row.product_code || ''),
    salePrice: row.sale_price === null || row.sale_price === undefined ? null : Number(row.sale_price),
    sale_price: row.sale_price === null || row.sale_price === undefined ? null : Number(row.sale_price),
    sizeLabel: String(row.size_label || 'One Size'),
    stockQuantity: Number(row.stock_quantity || 0),
    reservedQuantity: Number(row.reserved_quantity || 0),
    soldQuantity: Number(row.sold_quantity || 0),
    availableQuantity: Math.max(0, Number(row.stock_quantity || 0) - Number(row.reserved_quantity || 0)),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  }));
  const imagesByProductId = groupByProductId(imageRows, 'image_url', row => ({
    id: String(row.id),
    productId: String(row.product_id),
    colorVariantId: row.color_variant_id ? String(row.color_variant_id) : '',
    colorName: String(row.color_name || ''),
    imageUrl: String(row.image_url || ''),
    altText: String(row.alt_text || ''),
    isPrimary: Boolean(row.is_primary),
    sortOrder: Number(row.sort_order || 0),
    createdAt: row.created_at || null
  }));
  const materialRowsByProductId = groupByProductId(materialRows, 'id', row => row);
  const materialInformationByProductId = groupMaterialInformationByProductId(materialInformationRows);

  return productRows.map(row =>
    {
      const inventoryItems = inventoryItemsByProductId[row.id] || [];
      const uniqueSizes = [...new Set(inventoryItems.map(item => item.sizeLabel).filter(Boolean))];
      const uniqueColors = [...new Set(inventoryItems.map(item => item.colorName).filter(Boolean))].map(colorName => {
        const matchedVariant = inventoryItems.find(item => item.colorName === colorName);
        return {
          name: colorName,
          hex: matchedVariant ? matchedVariant.colorHex : '',
          family: matchedVariant ? matchedVariant.colorFamily : normalizeColorFamily('', colorName),
          colorFamily: matchedVariant ? matchedVariant.colorFamily : normalizeColorFamily('', colorName),
          color_family: matchedVariant ? matchedVariant.colorFamily : normalizeColorFamily('', colorName),
          value: matchedVariant ? colorFamilyValue(matchedVariant.colorFamily) : colorFamilyValue(colorName),
          colorVariantId: matchedVariant ? matchedVariant.colorVariantId : '',
          productCode: matchedVariant ? matchedVariant.productCode : '',
          articleNumber: matchedVariant ? matchedVariant.articleNumber : '',
          salePrice: matchedVariant ? matchedVariant.salePrice : null,
          sale_price: matchedVariant ? matchedVariant.salePrice : null
        };
      });
      const totalInventory = inventoryItems.reduce((total, item) => total + Number(item.availableQuantity || 0), 0);
      const totalStockQuantity = inventoryItems.reduce((total, item) => total + Number(item.stockQuantity || 0), 0);
      const productRow = { ...row };
      delete productRow.inventory_items_json;
      delete productRow.product_images_json;
      delete productRow.product_materials_json;
      delete productRow.product_material_information_json;

      const materialPayload = buildMaterialPayload(materialRowsByProductId[row.id] || []);

      return serializeProduct({
        ...productRow,
        category: row.category_name,
        categoryId: row.category_id,
        categoryLabel: row.category_label,
        categorySlug: row.category_slug,
        productGroupId: row.product_group_id,
        productGroup: row.product_group_name,
        productGroupLabel: row.product_group_label,
        productGroupSlug: row.product_group_slug,
        productGroupSortOrder: row.product_group_sort_order,
        gender: row.department_name,
        departmentId: row.department_id,
        departmentLabel: row.department_label,
        collectionId: row.collection_id,
        collectionSlug: row.collection_slug,
        styleId: row.style_id,
        styleName: row.style_name,
        styleSlug: row.style_slug,
        fitId: row.fit_id,
        fitName: row.fit_name,
        fitSlug: row.fit_slug,
        heelHeight: row.heel_height,
        collection: row.collection_name,
        originalPrice: row.original_price,
        salePrice: row.sale_price,
        pricingMode: row.pricing_mode,
        isSale: row.is_sale,
        rating: row.approved_review_rating,
        reviews: row.approved_review_count,
        soldCount: row.ordered_quantity ?? row.sold_count,
        primaryColor: uniqueColors[0]?.name,
        inventory: totalInventory,
        stockQuantity: totalStockQuantity,
        inventoryItems,
        sizes: uniqueSizes,
        materials: materialPayload.materials,
        materialFilterValues: materialPayload.materialFilterValues,
        materialFilterOptions: materialPayload.materialFilterOptions,
        materialInformation: materialInformationByProductId[row.id] || null,
        colors: uniqueColors,
        colorVariants: uniqueColors,
        productImages: imagesByProductId[row.id] || [],
        palette: {
          base: row.palette_base,
          accent: row.palette_accent,
          glow: row.palette_glow
        }
      });
    }
  );
};

const findProductRowById = async (db, productId, options = {}) => {
  const key = String(productId || '').trim();

  if (!key) {
    return null;
  }

  return productModel.findPublicRow(db, {
    selectSql: PRODUCT_SELECT,
    key,
    useId: isValidUuid(key),
    activeOnly: Boolean(options.activeOnly)
  });
};

const hasCompleteProductUpdatePayload = payload => {
  const body = payload && typeof payload === 'object' ? payload : {};

  return (
    Object.prototype.hasOwnProperty.call(body, 'name') &&
    Object.prototype.hasOwnProperty.call(body, 'gender') &&
    Object.prototype.hasOwnProperty.call(body, 'category') &&
    Array.isArray(body.inventoryItems) &&
    (Array.isArray(body.productImages) || Array.isArray(body.product_images))
  );
};

const findProductById = async (db, productId, options = {}) => {
  const productRow = await findProductRowById(db, productId, options);

  if (!productRow) {
    return null;
  }

  const hydratedProducts = await hydrateProducts(db, [productRow]);
  return hydratedProducts[0] || null;
};

const getUploadBaseUrl = req =>
  String(process.env.UPLOAD_BASE_URL || process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');

const normalizeSubmittedProductImages = images => {
  if (!Array.isArray(images)) {
    return [];
  }

  const normalized = images
    .map((image, index) => ({
      colorVariantId: String(image.colorVariantId || image.color_variant_id || '').trim(),
      colorName: String(image.colorName || image.color_name || '').trim(),
      imageUrl: String(image.imageUrl || image.image_url || image.url || '').trim(),
      altText: String(image.altText || image.alt_text || '').trim(),
      isPrimary: Boolean(image.isPrimary || image.is_primary),
      sortOrder: Number.parseInt(image.sortOrder ?? image.sort_order ?? index, 10) || 0
    }))
    .filter(image => image.imageUrl);

  const primaryByColor = new Set();
  const hasPrimaryByColor = normalized.reduce((accumulator, image) => {
    const colorKey = image.colorVariantId || image.colorName.toLowerCase();
    if (!accumulator.has(colorKey)) {
      accumulator.set(colorKey, false);
    }
    if (image.isPrimary) {
      accumulator.set(colorKey, true);
    }
    return accumulator;
  }, new Map());

  return normalized.map((image, index) => {
    const colorKey = image.colorVariantId || image.colorName.toLowerCase();
    const shouldSetDefaultPrimary = !hasPrimaryByColor.get(colorKey) && normalized.findIndex(candidate =>
      (candidate.colorVariantId || candidate.colorName.toLowerCase()) === colorKey
    ) === index;
    const shouldKeepPrimary = image.isPrimary && !primaryByColor.has(colorKey);

    if (shouldKeepPrimary || shouldSetDefaultPrimary) {
      primaryByColor.add(colorKey);
      return { ...image, isPrimary: true };
    }

    return { ...image, isPrimary: false };
  });
};

const syncProductImages = async (db, productId, images = []) => {
  const normalizedImages = normalizeSubmittedProductImages(images);

  clearProductRelationsSignatureCache(productId);
  const imagesJson = normalizedImages.length
    ? JSON.stringify(normalizedImages.map((image, index) => ({
        color_variant_id: image.colorVariantId || null,
        color_name: image.colorName || '',
        image_url: image.imageUrl,
        alt_text: image.altText || '',
        is_primary: image.isPrimary,
        sort_order: Number.isFinite(image.sortOrder) ? image.sortOrder : index
      })))
    : null;

  await productModel.replaceAdminImages(db, productId, imagesJson);
};

const PRODUCT_ORDER_HISTORY_DELETE_MESSAGE = 'This product cannot be removed because it has order history.';
const COLOR_ORDER_HISTORY_DELETE_MESSAGE = 'This color cannot be removed because it has order history.';
const SIZE_ORDER_HISTORY_DELETE_MESSAGE = 'This size cannot be removed because it has order history.';
const PRODUCT_RELATION_SIGNATURE_CACHE_TTL_MS = 60000;
const productRelationSignatureCache = new Map();

const getCachedProductRelationsSignature = productId => {
  const cached = productRelationSignatureCache.get(String(productId || ''));

  if (!cached || cached.expiresAt <= Date.now()) {
    productRelationSignatureCache.delete(String(productId || ''));
    return null;
  }

  return cached.signatureJson;
};
const setCachedProductRelationsSignature = (productId, signature) => {
  productRelationSignatureCache.set(String(productId || ''), {
    expiresAt: Date.now() + PRODUCT_RELATION_SIGNATURE_CACHE_TTL_MS,
    signatureJson: JSON.stringify(signature)
  });
};
const clearProductRelationsSignatureCache = productId => {
  productRelationSignatureCache.delete(String(productId || ''));
};

const throwOrderHistoryDeleteError = message => {
  const error = new Error(message);
  error.statusCode = 409;
  throw error;
};

const normalizeVariantKeyPart = value => String(value || '').trim().toLowerCase();

const normalizeOptionalVariantPrice = (value, label, originalPrice) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    const error = new Error(`${label} must be a valid price greater than or equal to 0.`);
    error.statusCode = 400;
    throw error;
  }

  if (Number.isFinite(originalPrice) && originalPrice > 0 && numericValue >= originalPrice) {
    const error = new Error(`${label} must be lower than the product original price.`);
    error.statusCode = 400;
    throw error;
  }

  return Number(numericValue.toFixed(2));
};

const normalizeSubmittedColorVariants = (product, productId) => {
  const metadataByColor = new Map();
  const originalPrice = Number(product.originalPrice ?? product.original_price ?? product.price ?? 0);

  [...(Array.isArray(product.colorVariants) ? product.colorVariants : []), ...(Array.isArray(product.colors) ? product.colors : [])]
    .forEach((color, index) => {
      const name = String(color && (color.name || color.colorName || color.color_name) || '').trim();
      const key = normalizeVariantKeyPart(name);

      if (!key || metadataByColor.has(key)) {
        return;
      }

      const family = normalizeColorFamily(color.family || color.colorFamily || color.color_family, name);
      const rawHex = String(color.hex || color.colorHex || color.color_hex || '').trim();

      if (rawHex && !isValidColorHex(rawHex)) {
        const error = new Error(`Color hex for ${name || 'this color'} must be a valid hex value.`);
        error.statusCode = 400;
        throw error;
      }

      const rawProductCode = normalizeProductCode(
        color.productCode || color.product_code || color.articleNumber || color.article_number || ''
      );
      const isAutoGenerated = Boolean(
        color.productCodeAutoGenerated ||
        color.product_code_auto_generated ||
        !rawProductCode
      );
      const salePrice = normalizeOptionalVariantPrice(
        color.salePrice ?? color.sale_price,
        `Sale price for ${name || 'this color'}`,
        originalPrice
      );
      metadataByColor.set(key, {
        id: String(color.id || color.colorVariantId || color.color_variant_id || '').trim(),
        name,
        hex: rawHex || defaultHexForColorFamily(family),
        family,
        productCode: isAutoGenerated ? '' : rawProductCode,
        articleNumber: isAutoGenerated
          ? ''
          : normalizeProductCode(color.articleNumber || color.article_number || color.productCode || color.product_code || ''),
        productCodeAutoGenerated: isAutoGenerated,
        salePrice,
        sortOrder: Number.parseInt(color.sortOrder ?? color.sort_order ?? index, 10) || index
      });
    });

  const colorOrder = [];

  (Array.isArray(product.inventoryItems) ? product.inventoryItems : []).forEach(item => {
    const name = String(item && item.colorName || '').trim();
    const key = normalizeVariantKeyPart(name);

    if (!key || colorOrder.includes(key)) {
      return;
    }

    colorOrder.push(key);
    const itemProductCode = normalizeProductCode(item.productCode || item.product_code || item.articleNumber || item.article_number || '');

    if (!metadataByColor.has(key)) {
      metadataByColor.set(key, {
        id: '',
        name,
        hex: String(item.colorHex || '').trim() || defaultHexForColorFamily(normalizeColorFamily(item.colorFamily || item.color_family, name)),
        family: normalizeColorFamily(item.colorFamily || item.color_family, name),
        productCode: '',
        articleNumber: '',
        productCodeAutoGenerated: !itemProductCode,
        salePrice: normalizeOptionalVariantPrice(item.salePrice ?? item.sale_price, `Sale price for ${name}`, originalPrice),
        sortOrder: colorOrder.length - 1
      });
    } else {
      const metadata = metadataByColor.get(key);
      if (!metadata.productCodeAutoGenerated && !metadata.productCode && itemProductCode) {
        metadata.productCode = itemProductCode;
        metadata.articleNumber = metadata.articleNumber || itemProductCode;
      }

      if (metadata.salePrice === null) {
        metadata.salePrice = normalizeOptionalVariantPrice(item.salePrice ?? item.sale_price, `Sale price for ${name}`, originalPrice);
      }

    }
  });

  const variants = colorOrder.map((key, index) => {
    const color = metadataByColor.get(key);
    const generatedProductCode = generateProductCode({
      gender: product.gender,
      productGroup: product.productGroup || product.product_group,
      category: product.category,
      categoryLabel: product.categoryLabel || product.category_label,
      productId,
      productName: product.name,
      colorName: color.name,
      colorFamily: color.family
    });
    const productCode = normalizeProductCode(color.productCode || color.articleNumber || generatedProductCode);

    return {
      ...color,
      productCode,
      articleNumber: color.articleNumber || productCode,
      sortOrder: index
    };
  });
  const submittedCodes = new Set();

  for (const variant of variants) {
    const codeKey = variant.productCode.trim().toLowerCase();
    let suffix = 2;
    let nextProductCode = variant.productCode;
    let nextCodeKey = codeKey;

    while (submittedCodes.has(nextCodeKey)) {
      nextProductCode = `${variant.productCode}-${suffix}`;
      nextCodeKey = nextProductCode.toLowerCase();
      suffix += 1;
    }

    variant.productCode = nextProductCode;
    variant.articleNumber = variant.articleNumber || nextProductCode;

    submittedCodes.add(nextCodeKey);
  }

  return variants;
};

const persistProductColorVariants = async (db, productId, colorVariantMetadata, options = {}) => {
  if (!colorVariantMetadata.length) {
    return new Map();
  }

  const colorVariantsJson = JSON.stringify(colorVariantMetadata.map(variant => ({
    color_name: variant.name,
    color_hex: variant.hex || defaultHexForColorFamily(variant.family || variant.name),
    color_family: normalizeColorFamily(variant.family, variant.name),
    product_code: variant.productCode || variant.articleNumber || '',
    sale_price: variant.salePrice,
    sort_order: variant.sortOrder || 0
  })));

  const rows = await productModel.persistAdminColorVariantRows(
    db,
    productId,
    colorVariantsJson,
    Boolean(options.isNew)
  );

  return new Map(rows.map(row => [
    normalizeVariantKeyPart(row.color_name),
    {
      id: String(row.id || ''),
      colorName: String(row.color_name || ''),
      colorHex: String(row.color_hex || ''),
      colorFamily: normalizeColorFamily(row.color_family, row.color_name),
      productCode: String(row.product_code || ''),
      salePrice: row.sale_price === null || row.sale_price === undefined ? null : Number(row.sale_price)
    }
  ]));
};

const ensureRemovedInventoryHasNoOrderHistory = async (db, productId, submittedInventoryItems) => {
  const existingRows = await productModel.listAdminInventoryRowsForUpdate(db, productId);

  if (!existingRows.length) {
    return;
  }

  const submittedColors = new Set(
    submittedInventoryItems.map(item => normalizeVariantKeyPart(item.colorName))
  );
  const submittedVariantKeys = new Set(
    submittedInventoryItems.map(item =>
      `${normalizeVariantKeyPart(item.colorName)}__${normalizeVariantKeyPart(item.sizeLabel)}`
    )
  );
  const removedColorVariants = existingRows.filter(
    row => !submittedColors.has(normalizeVariantKeyPart(row.color_name))
  );
  const removedSizeVariants = existingRows.filter(row => {
    const colorName = normalizeVariantKeyPart(row.color_name);
    const variantKey = `${colorName}__${normalizeVariantKeyPart(row.size_label)}`;
    return submittedColors.has(colorName) && !submittedVariantKeys.has(variantKey);
  });

  if (removedColorVariants.length) {
    const removedColors = [...new Set(
      removedColorVariants.map(row => normalizeVariantKeyPart(row.color_name))
    )];
    const removedVariantIds = removedColorVariants.map(row => row.id);
    if (await productModel.hasAdminColorOrderHistory(db, productId, removedColors, removedVariantIds)) {
      throwOrderHistoryDeleteError(COLOR_ORDER_HISTORY_DELETE_MESSAGE);
    }
  }

  if (removedSizeVariants.length) {
    const removedVariantIds = removedSizeVariants.map(row => row.id);
    const removedVariantKeys = removedSizeVariants.map(
      row => `${normalizeVariantKeyPart(row.color_name)}__${normalizeVariantKeyPart(row.size_label)}`
    );
    if (await productModel.hasAdminSizeOrderHistory(db, productId, removedVariantIds, removedVariantKeys)) {
      throwOrderHistoryDeleteError(SIZE_ORDER_HISTORY_DELETE_MESSAGE);
    }
  }
};

const normalizeSignatureText = value => String(value || '').trim();
const normalizeSignatureNumber = value => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Number(numberValue.toFixed(2)) : null;
};
const normalizeSignatureInteger = value => {
  const numberValue = Number.parseInt(value, 10);
  return Number.isFinite(numberValue) ? numberValue : 0;
};
const normalizeSignatureBoolean = value => value === true || String(value || '').toLowerCase() === 'true';
const sortSignatureRows = (...fields) => (left, right) => {
  for (const field of fields) {
    const leftValue = left[field];
    const rightValue = right[field];
    const comparison = String(leftValue ?? '').localeCompare(String(rightValue ?? ''), undefined, {
      numeric: true
    });

    if (comparison !== 0) {
      return comparison;
    }
  }

  return 0;
};
const normalizeRelationSignature = signature => {
  const colors = (Array.isArray(signature.colors) ? signature.colors : [])
    .map(color => ({
      colorName: normalizeSignatureText(color.colorName || color.color_name),
      colorHex: normalizeSignatureText(color.colorHex || color.color_hex),
      colorFamily: normalizeColorFamily(color.colorFamily || color.color_family, color.colorName || color.color_name),
      productCode: normalizeProductCode(color.productCode || color.product_code || ''),
      salePrice: normalizeSignatureNumber(color.salePrice ?? color.sale_price),
      sortOrder: normalizeSignatureInteger(color.sortOrder ?? color.sort_order)
    }))
    .sort(sortSignatureRows('sortOrder', 'colorName'));
  const images = (Array.isArray(signature.images) ? signature.images : [])
    .map(image => ({
      colorName: normalizeSignatureText(image.colorName || image.color_name),
      imageUrl: normalizeSignatureText(image.imageUrl || image.image_url),
      altText: normalizeSignatureText(image.altText || image.alt_text),
      isPrimary: normalizeSignatureBoolean(image.isPrimary ?? image.is_primary),
      sortOrder: normalizeSignatureInteger(image.sortOrder ?? image.sort_order)
    }))
    .sort(sortSignatureRows('sortOrder', 'colorName', 'imageUrl'));
  const materials = (Array.isArray(signature.materials) ? signature.materials : [])
    .map(material => ({
      materialId: normalizeSignatureText(material.materialId || material.material_id),
      partName: normalizeSignatureText(material.partName || material.part_name || 'Main') || 'Main',
      materialName: normalizeSignatureText(material.materialName || material.material_name || material.name),
      materialPercent: normalizeSignatureNumber(material.materialPercent ?? material.material_percent ?? material.percent),
      sortOrder: normalizeSignatureInteger(material.sortOrder ?? material.sort_order)
    }))
    .filter(material => material.materialName)
    .sort(sortSignatureRows('sortOrder', 'partName', 'materialName'));
  const rawMaterialInformation = signature.materialInformation || signature.material_information || null;
  const materialInformation = rawMaterialInformation && normalizeSignatureText(rawMaterialInformation.content || rawMaterialInformation.highlight_text)
    ? {
        title: normalizeSignatureText(rawMaterialInformation.title || DEFAULT_MATERIAL_INFORMATION_TITLE) || DEFAULT_MATERIAL_INFORMATION_TITLE,
        content: String(rawMaterialInformation.content ?? rawMaterialInformation.highlight_text ?? ''),
        sortOrder: normalizeSignatureInteger(rawMaterialInformation.sortOrder ?? rawMaterialInformation.sort_order)
      }
    : null;
  const inventory = (Array.isArray(signature.inventory) ? signature.inventory : [])
    .map(item => ({
      colorName: normalizeSignatureText(item.colorName || item.color_name),
      colorHex: normalizeSignatureText(item.colorHex || item.color_hex),
      sizeLabel: normalizeSignatureText(item.sizeLabel || item.size_label),
      stockQuantity: normalizeSignatureInteger(item.stockQuantity ?? item.stock_quantity),
      reservedQuantity: normalizeSignatureInteger(item.reservedQuantity ?? item.reserved_quantity),
      soldQuantity: normalizeSignatureInteger(item.soldQuantity ?? item.sold_quantity),
      productCode: normalizeProductCode(item.productCode || item.product_code || ''),
      articleNumber: normalizeProductCode(item.articleNumber || item.article_number || item.productCode || item.product_code || '')
    }))
    .sort(sortSignatureRows('colorName', 'sizeLabel'));

  return {
    colors,
    images,
    materials,
    materialInformation,
    inventory
  };
};
const buildSubmittedProductRelationsSignature = (product, productId, colorVariantMetadata) => {
  const colorCodeMap = new Map(colorVariantMetadata.map(variant => [
    normalizeVariantKeyPart(variant.name),
    {
      productCode: variant.productCode,
      articleNumber: variant.articleNumber || variant.productCode,
      family: normalizeColorFamily(variant.family, variant.name)
    }
  ]));
  const materialInformation = product.materialInformation || {};

  return normalizeRelationSignature({
    colors: colorVariantMetadata.map(variant => ({
      colorName: variant.name,
      colorHex: variant.hex || defaultHexForColorFamily(variant.family || variant.name),
      colorFamily: normalizeColorFamily(variant.family, variant.name),
      productCode: variant.productCode || variant.articleNumber || generateProductCode({
        productGroup: product.productGroup || product.product_group,
        category: product.category,
        categoryLabel: product.categoryLabel || product.category_label,
        productId,
        productName: product.name,
        colorName: variant.name,
        colorFamily: variant.family
      }),
      salePrice: variant.salePrice,
      sortOrder: variant.sortOrder || 0
    })),
    images: normalizeSubmittedProductImages(product.productImages || []),
    materials: product.materials || [],
    materialInformation: {
      title: String(materialInformation.title || DEFAULT_MATERIAL_INFORMATION_TITLE).trim() || DEFAULT_MATERIAL_INFORMATION_TITLE,
      content: materialInformation.content === null || materialInformation.content === undefined
        ? ''
        : String(materialInformation.content),
      sortOrder: 0
    },
    inventory: product.inventoryItems.map(inventoryItem => {
      const colorCode = colorCodeMap.get(normalizeVariantKeyPart(inventoryItem.colorName));

      return {
        colorName: inventoryItem.colorName,
        colorHex: inventoryItem.colorHex || '',
        sizeLabel: inventoryItem.sizeLabel,
        stockQuantity: inventoryItem.stockQuantity,
        reservedQuantity: inventoryItem.reservedQuantity || 0,
        soldQuantity: inventoryItem.soldQuantity || 0,
        productCode: colorCode?.productCode || inventoryItem.productCode || inventoryItem.product_code || '',
        articleNumber:
          colorCode?.articleNumber ||
          inventoryItem.articleNumber ||
          inventoryItem.article_number ||
          inventoryItem.productCode ||
          inventoryItem.product_code ||
          ''
      };
    })
  });
};
const loadPersistedProductRelationsSignature = async (db, productId) => {
  const row = await productModel.loadAdminRelationsSignatureRow(db, productId);

  return normalizeRelationSignature({
    colors: row.colors,
    images: row.images,
    materials: row.materials,
    materialInformation: row.material_information,
    inventory: row.inventory
  });
};
const productRelationsAreUnchanged = async (db, productId, product, colorVariantMetadata) => {
  const submittedSignature = buildSubmittedProductRelationsSignature(product, productId, colorVariantMetadata);
  const submittedSignatureJson = JSON.stringify(submittedSignature);
  const cachedSignatureJson = getCachedProductRelationsSignature(productId);

  if (cachedSignatureJson && cachedSignatureJson === submittedSignatureJson) {
    return true;
  }

  const persistedSignature = await loadPersistedProductRelationsSignature(db, productId);
  const persistedSignatureJson = JSON.stringify(persistedSignature);

  if (
    process.env.DEBUG_PRODUCT_RELATION_SIGNATURE === 'true' &&
    submittedSignatureJson !== persistedSignatureJson
  ) {
    console.dir({
      productId,
      submittedSignature,
      persistedSignature
    }, { depth: null });
  }

  if (submittedSignatureJson === persistedSignatureJson) {
    setCachedProductRelationsSignature(productId, submittedSignature);
    return true;
  }

  return false;
};

const syncProductRelations = async (db, productId, product, options = {}) => {
  const submittedInventoryItems = product.inventoryItems.map(item => ({
    colorName: String(item.colorName || '').trim(),
    sizeLabel: String(item.sizeLabel || '').trim()
  }));
  const submittedInventoryKeys = new Set();
  const hasDuplicateInventoryItem = submittedInventoryItems.some(item => {
    const key = `${item.colorName.toLowerCase()}__${item.sizeLabel.toLowerCase()}`;

    if (submittedInventoryKeys.has(key)) {
      return true;
    }

    submittedInventoryKeys.add(key);
    return false;
  });

  if (hasDuplicateInventoryItem) {
    const error = new Error('This color and size already exists for this product.');
    error.statusCode = 400;
    throw error;
  }

  const colorVariantMetadata = normalizeSubmittedColorVariants(product, productId);
  const submittedRelationSignature = buildSubmittedProductRelationsSignature(product, productId, colorVariantMetadata);

  if (!options.isNew && await productRelationsAreUnchanged(db, productId, product, colorVariantMetadata)) {
    return;
  }

  if (!options.isNew) {
    await ensureRemovedInventoryHasNoOrderHistory(db, productId, submittedInventoryItems);
  }

  const persistedColorVariantMap = await persistProductColorVariants(db, productId, colorVariantMetadata, {
    isNew: Boolean(options.isNew)
  });
  const colorCodeMap = new Map(colorVariantMetadata.map(variant => [
    normalizeVariantKeyPart(variant.name),
    {
      productCode: variant.productCode,
      articleNumber: variant.articleNumber || variant.productCode,
      family: normalizeColorFamily(variant.family, variant.name)
    }
  ]));
  const normalizedImages = normalizeSubmittedProductImages(product.productImages || []);
  const imagesJson = JSON.stringify(normalizedImages.map((image, index) => ({
    color_variant_id:
      persistedColorVariantMap.get(normalizeVariantKeyPart(image.colorName))?.id ||
      image.colorVariantId ||
      null,
    color_name: image.colorName || '',
    image_url: image.imageUrl,
    alt_text: image.altText || '',
    is_primary: image.isPrimary,
    sort_order: Number.isFinite(image.sortOrder) ? image.sortOrder : index
  })));
  const materialsJson = JSON.stringify(product.materials.map((material, index) => ({
    material_id: material.materialId || material.material_id || null,
    part_name: material.partName || material.part_name || 'Main',
    material_name: material.materialName || material.material_name || material.name || '',
    material_percent: material.materialPercent ?? material.material_percent ?? material.percent ?? null,
    sort_order: Number.isFinite(Number(material.sortOrder ?? material.sort_order))
      ? Number(material.sortOrder ?? material.sort_order)
      : index
  })));
  const materialInformation = product.materialInformation || {};
  const materialInformationJson = JSON.stringify({
    title: String(materialInformation.title || DEFAULT_MATERIAL_INFORMATION_TITLE).trim() || DEFAULT_MATERIAL_INFORMATION_TITLE,
    highlight_text: materialInformation.content === null || materialInformation.content === undefined
      ? ''
      : String(materialInformation.content),
    sort_order: 0
  });
  const inventoryJson = JSON.stringify(product.inventoryItems.map(inventoryItem => ({
    color_variant_id:
      persistedColorVariantMap.get(normalizeVariantKeyPart(inventoryItem.colorName))?.id ||
      inventoryItem.colorVariantId ||
      inventoryItem.color_variant_id ||
      null,
    product_code: colorCodeMap.get(normalizeVariantKeyPart(inventoryItem.colorName))?.productCode ||
      inventoryItem.productCode ||
      inventoryItem.product_code ||
      null,
    article_number: colorCodeMap.get(normalizeVariantKeyPart(inventoryItem.colorName))?.articleNumber ||
      inventoryItem.articleNumber ||
      inventoryItem.article_number ||
      inventoryItem.productCode ||
      inventoryItem.product_code ||
      null,
    color_name: inventoryItem.colorName,
    color_hex: inventoryItem.colorHex || '',
    size_label: inventoryItem.sizeLabel,
    stock_quantity: inventoryItem.stockQuantity,
    reserved_quantity: inventoryItem.reservedQuantity || 0,
    sold_quantity: inventoryItem.soldQuantity || 0
  })));
  const submittedInventoryJson = JSON.stringify(submittedInventoryItems.map(item => ({
    color_name: item.colorName,
    size_label: item.sizeLabel
  })));

  if (!options.isNew) {
    await productModel.deleteStaleAdminRelations(db, productId, submittedInventoryJson);
  }

  await productModel.upsertAdminRelations(
    db,
    productId,
    imagesJson,
    materialsJson,
    materialInformationJson,
    inventoryJson
  );

  setCachedProductRelationsSignature(productId, submittedRelationSignature);
};

const resolveProductReferences = async (db, product) => {
  const gender = String(product.gender || '').trim();
  const categoryValue = String(product.category || '').trim();
  const productGroupValue = String(product.productGroup || product.product_group || product.productGroupSlug || '').trim();
  const collectionName = String(product.collection || '').trim();
  const collectionSlug = slugify(collectionName);
  const styleName = String(product.styleName || product.style_name || '').trim();
  const styleSlug = slugify(styleName);
  const fitName = String(product.fitName || product.fit || '').trim();
  const fitSlug = slugify(fitName);

  const row = await productModel.resolveAdminReferenceRow(db, {
    gender,
    categoryValue,
    productGroupValue,
    collectionName,
    collectionSlug,
    styleName,
    styleSlug,
    fitName,
    fitSlug
  });
  const department = row.department_id
    ? {
        id: row.department_id,
        name: row.department_name,
        label: row.department_label
      }
    : null;

  if (!department) {
    const error = new Error(`Department "${product.gender}" was not found.`);
    error.statusCode = 400;
    throw error;
  }

  const category = row.category_id
    ? {
        id: row.category_id,
        name: row.category_name,
        label: row.category_label,
        slug: row.category_slug
      }
    : null;
  const productGroup = row.product_group_id
    ? {
        id: row.product_group_id,
        name: row.product_group_name,
        label: row.product_group_label,
        slug: row.product_group_slug,
        sortOrder: row.product_group_sort_order
      }
    : null;

  if (!category) {
    const error = new Error(`Category "${product.category}" was not found in ${department.label || department.name}.`);
    error.statusCode = 400;
    throw error;
  }

  if (String(productGroup && productGroup.slug || '').toLowerCase() === 'clothing' && String(product.fit || '').trim() && !row.fit_id) {
    const error = new Error(`Fit "${product.fit}" is not available for the selected department.`);
    error.statusCode = 400;
    throw error;
  }

  if (collectionName && !row.collection_id) {
    const error = new Error(`Collection "${product.collection}" is not available for ${department.label || department.name}.`);
    error.statusCode = 400;
    throw error;
  }

  return {
    department,
    category,
    productGroup,
    collectionId: row.collection_id || null,
    styleId: row.style_id || null,
    fitId: row.fit_id || null
  };
};

const catalogController = createCatalogController({
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
});

exports.listDepartments = catalogController.listDepartments;
exports.listLandingCollections = catalogController.listLandingCollections;
exports.listMaterials = catalogController.listMaterials;
exports.listAllProducts = catalogController.listAllProducts;
exports.warmProductListCache = catalogController.warmProductListCache;
exports.invalidateProductListCache = catalogController.invalidateProductListCache;
exports.searchProducts = catalogController.searchProducts;
exports.listCollections = catalogController.listCollections;
exports.listCategories = catalogController.listCategories;
exports.getCategorySizeGuide = catalogController.getCategorySizeGuide;
exports.readProduct = catalogController.readProduct;

const adminProductController = createAdminProductController({
  PRODUCT_ORDER_HISTORY_DELETE_MESSAGE,
  buildProductPayload,
  clearProductRelationsSignatureCache,
  invalidateProductListCache: catalogController.invalidateProductListCache,
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
});

exports.readAdminProduct = adminProductController.readAdminProduct;
exports.createProduct = adminProductController.createProduct;
exports.updateProduct = adminProductController.updateProduct;
exports.deleteProduct = adminProductController.deleteProduct;
exports.syncProductImages = adminProductController.syncProductImages;
exports.uploadProductImage = adminProductController.uploadProductImage;
