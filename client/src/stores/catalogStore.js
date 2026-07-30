import { collectionApi } from '../services/collectionApi';
import { productApi } from '../services/productApi';

const CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_COLLECTION_BASE = '#efe8df';
const DEFAULT_COLLECTION_ACCENT = '#1f2430';

export const normalizeDepartment = value => (String(value || '').trim().toLowerCase() === 'men' ? 'men' : 'women');

const state = {
  products: [],
  productsById: {},
  categories: [],
  collections: [],
  departments: [],
  materials: [],
  landingCollections: [],
  expiresAt: 0,
  collectionsExpiresAt: 0,
  departmentsExpiresAt: 0,
  materialsExpiresAt: 0,
  landingCollectionsExpiresAt: 0,
  productsPromise: null,
  collectionsPromise: null,
  departmentsPromise: null,
  materialsPromise: null,
  landingCollectionsPromise: null,
  productPromises: {}
};

const normalizeProducts = products =>
  (Array.isArray(products) ? products : []).filter(product => product && product.id);

const normalizeCategoryTree = categories =>
  (Array.isArray(categories) ? categories : []).map(category => ({
    id: String(category.id || ''),
    name: String(category.name || '').trim(),
    label: String(category.label || category.name || '').trim(),
    slug: String(category.slug || category.name || '').trim(),
    productGroupId: String(category.productGroupId || category.product_group_id || '').trim(),
    productGroup: String(category.productGroup || category.product_group || '').trim(),
    productGroupLabel: String(category.productGroupLabel || category.product_group_label || '').trim(),
    productGroupSlug: String(category.productGroupSlug || category.product_group_slug || '').trim(),
    productCount: Number(category.productCount || category.product_count || 0)
  }));

const flattenCategoryTree = categories => normalizeCategoryTree(categories);

const normalizeDepartmentGroups = groups =>
  (Array.isArray(groups) ? groups : []).map(group => ({
    id: String(group.id || ''),
    name: String(group.name || group.slug || '').trim(),
    label: String(group.label || group.name || '').trim(),
    slug: String(group.slug || group.name || '').trim(),
    sortOrder: Number(group.sortOrder || group.sort_order || 0),
    categories: normalizeCategoryTree(group.categories).map(category => ({
      ...category,
      productGroupId: String(category.productGroupId || category.product_group_id || group.id || '').trim(),
      productGroup: String(category.productGroup || category.product_group || group.name || group.slug || '').trim(),
      productGroupLabel: String(category.productGroupLabel || category.product_group_label || group.label || group.name || '').trim(),
      productGroupSlug: String(category.productGroupSlug || category.product_group_slug || group.slug || group.name || '').trim()
    }))
  }));

const normalizeMaterialOptions = materials =>
  (Array.isArray(materials) ? materials : []).map(material => ({
    id: String(material.id || ''),
    name: String(material.name || material.label || '').trim(),
    label: String(material.label || material.name || '').trim(),
    value: String(material.value || material.slug || material.name || '').trim(),
    slug: String(material.slug || material.value || '').trim(),
    productGroupId: String(material.productGroupId || material.product_group_id || '').trim(),
    productGroupSlug: String(material.productGroupSlug || material.product_group_slug || '').trim(),
    productGroupLabel: String(material.productGroupLabel || material.product_group_label || '').trim(),
    departmentId: String(material.departmentId || material.department_id || '').trim(),
    departmentName: String(material.departmentName || material.department_name || '').trim(),
    departmentLabel: String(material.departmentLabel || material.department_label || '').trim(),
    sortOrder: Number(material.sortOrder || material.sort_order || 0)
  })).filter(material => material.value && material.label);

const mapProductsById = products =>
  products.reduce((accumulator, product) => {
    accumulator[String(product.id)] = product;
    if (product.slug) {
      accumulator[String(product.slug)] = product;
    }
    return accumulator;
  }, {});

const buildCollections = products => {
  const collectionsByName = products.reduce((accumulator, product) => {
    const name = String(product.collection || '').trim();

    if (!name) {
      return accumulator;
    }

    if (!accumulator[name]) {
      accumulator[name] = {
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        description: `${name} collection from the HEM. catalog.`,
        accent: DEFAULT_COLLECTION_ACCENT,
        base: DEFAULT_COLLECTION_BASE,
        productCount: 0
      };
    }

    accumulator[name].productCount += 1;
    return accumulator;
  }, {});

  return Object.values(collectionsByName).sort((left, right) => left.name.localeCompare(right.name));
};

const buildCategories = products => {
  const categoriesByName = products.reduce((accumulator, product) => {
    const name = String(product.category || '').trim();

    if (!name) {
      return accumulator;
    }

    if (!accumulator[name]) {
      accumulator[name] = {
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        productCount: 0,
        collections: new Set(),
        description: ''
      };
    }

    accumulator[name].productCount += 1;

    if (product.collection) {
      accumulator[name].collections.add(product.collection);
    }

    return accumulator;
  }, {});

  return Object.values(categoriesByName)
    .map(category => ({
      ...category,
      collections: [...category.collections].sort((left, right) => left.localeCompare(right)),
      description: `${category.productCount} products in ${category.name}.`
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
};

const applyProducts = products => {
  const normalizedProducts = normalizeProducts(products);

  state.products = normalizedProducts;
  state.productsById = mapProductsById(normalizedProducts);
  if (!hasFreshCollections()) {
    state.collections = buildCollections(normalizedProducts);
    state.collectionsExpiresAt = 0;
  }
  state.categories = buildCategories(normalizedProducts);
  state.expiresAt = Date.now() + CACHE_TTL_MS;

  return [...state.products];
};

const filterProductsByDepartment = (products, department) =>
  normalizeProducts(products).filter(product => normalizeDepartment(product.gender) === normalizeDepartment(department));

const _buildCategoriesForDepartment = (products, department) => {
  const departmentProducts = filterProductsByDepartment(products, department);
  const categoryNames = [...new Set(departmentProducts.map(product => String(product.category || '').trim()).filter(Boolean))];

  return categoryNames.sort((left, right) => left.localeCompare(right)).map(name => ({
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    count: departmentProducts.filter(product => String(product.category || '').trim() === name).length
  }));
};

const hasFreshProducts = () => state.products.length > 0 && state.expiresAt > Date.now();
const hasFreshCollections = () => state.collections.length > 0 && state.collectionsExpiresAt > Date.now();
const hasFreshDepartments = () => state.departments.length > 0 && state.departmentsExpiresAt > Date.now();
const hasFreshMaterials = () => state.materials.length > 0 && state.materialsExpiresAt > Date.now();
const hasFreshLandingCollections = () => state.landingCollections.length > 0 && state.landingCollectionsExpiresAt > Date.now();

const readCachedProduct = productId => {
  const key = String(productId || '').trim();
  return key ? state.productsById[key] || null : null;
};

const applyDepartments = departments => {
  state.departments = (Array.isArray(departments) ? departments : []).map(department => ({
    id: String(department.id || ''),
    name: normalizeDepartment(department.name),
    label: String(department.label || department.name || ''),
    categories: normalizeCategoryTree(department.categories),
    groups: normalizeDepartmentGroups(department.groups)
  }));
  state.departmentsExpiresAt = Date.now() + CACHE_TTL_MS;
  return [...state.departments];
};

const applyMaterials = materials => {
  state.materials = normalizeMaterialOptions(materials);
  state.materialsExpiresAt = Date.now() + CACHE_TTL_MS;
  return [...state.materials];
};

const normalizeCollection = item => {
  const departments = (Array.isArray(item.departments) ? item.departments : []).map(department => ({
    departmentId: String(department.departmentId || department.department_id || '').trim(),
    departmentName: normalizeDepartment(department.departmentName || department.department_name),
    departmentLabel: String(department.departmentLabel || department.department_label || '').trim(),
    bannerImage: String(department.bannerImage || department.banner_image_url || '').trim(),
    bannerPublicId: String(department.bannerPublicId || department.banner_public_id || '').trim(),
    status: String(department.status || 'active').trim().toLowerCase()
  }));

  return {
    type: String(item.type || '').trim(),
    id: String(item.id || ''),
    name: String(item.name || '').trim(),
    label: String(item.label || item.name || '').trim(),
    slug: String(item.slug || '').trim(),
    bannerImage: String(item.bannerImage || item.banner_image || item.imageUrl || item.image_url || '').trim(),
    imageUrl: String(item.imageUrl || item.image_url || item.bannerImage || item.banner_image || '').trim(),
    imageName: String(item.imageName || item.image_name || '').trim(),
    departments,
    availableDepartments: departments
      .filter(department => department.status === 'active')
      .map(department => department.departmentName)
      .filter(Boolean),
    productCount: Number(item.productCount || item.product_count || 0),
    createdAt: item.createdAt || item.created_at || null
  };
};

const applyCollections = collections => {
  state.collections = (Array.isArray(collections) ? collections : []).map(normalizeCollection);
  state.collectionsExpiresAt = Date.now() + CACHE_TTL_MS;
  return [...state.collections];
};

const applyLandingCollections = collections => {
  state.landingCollections = (Array.isArray(collections) ? collections : []).map(normalizeCollection);
  state.landingCollectionsExpiresAt = Date.now() + CACHE_TTL_MS;
  return [...state.landingCollections];
};

export const catalogStore = {
  getCachedProducts() {
    return [...state.products];
  },
  getCachedCollections() {
    return [...state.collections];
  },
  getCachedCategories() {
    return [...state.categories];
  },
  getCachedDepartments() {
    return [...state.departments];
  },
  getCachedMaterials() {
    return [...state.materials];
  },
  getCachedLandingCollections() {
    return [...state.landingCollections];
  },
  async getProducts(options = {}) {
    const shouldForce = Boolean(options.force);

    if (!shouldForce && hasFreshProducts()) {
      return [...state.products];
    }

    if (!shouldForce && state.productsPromise) {
      return state.productsPromise;
    }

    const existingProducts = [...state.products];

    state.productsPromise = (async () => {
      const nextProducts = await productApi.getProducts();

      if (!Array.isArray(nextProducts)) {
        return existingProducts;
      }

      if (!nextProducts.length && existingProducts.length) {
        state.expiresAt = Date.now() + CACHE_TTL_MS;
        return existingProducts;
      }

      return applyProducts(nextProducts);
    })();

    try {
      return await state.productsPromise;
    } finally {
      state.productsPromise = null;
    }
  },
  async getCollections(options = {}) {
    const shouldForce = Boolean(options.force);

    if (!shouldForce && hasFreshCollections()) {
      return [...state.collections];
    }

    if (!shouldForce && state.collectionsPromise) {
      return state.collectionsPromise;
    }

    const existingCollections = [...state.collections];

    state.collectionsPromise = (async () => {
      const nextCollections = await collectionApi.getCollections();

      if (!Array.isArray(nextCollections)) {
        return existingCollections;
      }

      if (!nextCollections.length && existingCollections.length) {
        state.collectionsExpiresAt = Date.now() + CACHE_TTL_MS;
        return existingCollections;
      }

      return applyCollections(nextCollections);
    })();

    try {
      return await state.collectionsPromise;
    } finally {
      state.collectionsPromise = null;
    }
  },
  async getMaterials(options = {}) {
    const shouldForce = Boolean(options.force);

    if (!shouldForce && hasFreshMaterials()) {
      return [...state.materials];
    }

    if (!shouldForce && state.materialsPromise) {
      return state.materialsPromise;
    }

    const existingMaterials = [...state.materials];

    state.materialsPromise = (async () => {
      const payload = await productApi.getMaterials();
      const nextMaterials = payload && Array.isArray(payload.items) ? payload.items : [];

      if (!nextMaterials.length && existingMaterials.length) {
        state.materialsExpiresAt = Date.now() + CACHE_TTL_MS;
        return existingMaterials;
      }

      return applyMaterials(nextMaterials);
    })();

    try {
      return await state.materialsPromise;
    } finally {
      state.materialsPromise = null;
    }
  },
  async getDepartments(options = {}) {
    const shouldForce = Boolean(options.force);

    if (!shouldForce && hasFreshDepartments()) {
      return [...state.departments];
    }

    if (!shouldForce && state.departmentsPromise) {
      return state.departmentsPromise;
    }

    const existingDepartments = [...state.departments];

    state.departmentsPromise = (async () => {
      const nextDepartments = await collectionApi.getDepartments();

      if (!Array.isArray(nextDepartments)) {
        return existingDepartments;
      }

      if (!nextDepartments.length && existingDepartments.length) {
        state.departmentsExpiresAt = Date.now() + CACHE_TTL_MS;
        return existingDepartments;
      }

      return applyDepartments(nextDepartments);
    })();

    try {
      return await state.departmentsPromise;
    } finally {
      state.departmentsPromise = null;
    }
  },
  async getLandingCollections(options = {}) {
    const shouldForce = Boolean(options.force);

    if (!shouldForce && hasFreshLandingCollections()) {
      return [...state.landingCollections];
    }

    if (!shouldForce && state.landingCollectionsPromise) {
      return state.landingCollectionsPromise;
    }

    const existingCollections = [...state.landingCollections];

    state.landingCollectionsPromise = (async () => {
      const nextCollections = await collectionApi.getLandingCollections();

      if (!Array.isArray(nextCollections)) {
        return existingCollections;
      }

      if (!nextCollections.length && existingCollections.length) {
        state.landingCollectionsExpiresAt = Date.now() + CACHE_TTL_MS;
        return existingCollections;
      }

      return applyLandingCollections(nextCollections);
    })();

    try {
      return await state.landingCollectionsPromise;
    } finally {
      state.landingCollectionsPromise = null;
    }
  },
  async getCategories(options = {}) {
    await this.getProducts(options);
    return [...state.categories];
  },
  async getDepartmentProducts(department, options = {}) {
    await this.getProducts(options);
    return filterProductsByDepartment(state.products, department);
  },
  async getDepartmentCategories(department, options = {}) {
    const departments = await this.getDepartments(options);
    const departmentRecord = departments.find(item => item.name === normalizeDepartment(department));

    if (!departmentRecord) {
      return [];
    }

    return normalizeCategoryTree(departmentRecord.categories);
  },
  async getDepartmentGroups(department, options = {}) {
    const departments = await this.getDepartments(options);
    const departmentRecord = departments.find(item => item.name === normalizeDepartment(department));

    if (!departmentRecord) {
      return [];
    }

    return normalizeDepartmentGroups(departmentRecord.groups);
  },
  async getDepartmentCategoryMap(department, options = {}) {
    const categories = await this.getDepartmentCategories(department, options);
    return flattenCategoryTree(categories).reduce((accumulator, category) => {
      const keys = [category.id, category.name, category.label, category.slug]
        .map(value => String(value || '').trim().toLowerCase())
        .filter(Boolean);

      keys.forEach(key => {
        accumulator[key] = category;
      });

      return accumulator;
    }, {});
  },
  async getProduct(productId, options = {}) {
    const key = String(productId || '').trim();
    const shouldForce = Boolean(options.force);

    if (!key) {
      return null;
    }

    if (!shouldForce) {
      const cachedProduct = readCachedProduct(key);

      if (cachedProduct) {
        return cachedProduct;
      }

      await this.getProducts();

      const productFromList = readCachedProduct(key);

      if (productFromList) {
        return productFromList;
      }
    }

    if (state.productPromises[key]) {
      return state.productPromises[key];
    }

    state.productPromises[key] = (async () => {
      const product = await productApi.getProduct(key);

      if (!product || !product.id) {
        return null;
      }

      const nextProducts = [...state.products];
      const existingIndex = nextProducts.findIndex(item => [item.id, item.slug].map(value => String(value || '')).includes(key));

      if (existingIndex >= 0) {
        nextProducts.splice(existingIndex, 1, product);
      } else if (nextProducts.length) {
        nextProducts.unshift(product);
      }

      if (nextProducts.length) {
        applyProducts(nextProducts);
      } else {
        state.productsById = {
          ...state.productsById,
          [key]: product
        };
      }

      return product;
    })();

    try {
      return await state.productPromises[key];
    } finally {
      delete state.productPromises[key];
    }
  },
  invalidate() {
    state.products = [];
    state.productsById = {};
    state.categories = [];
    state.collections = [];
    state.departments = [];
    state.landingCollections = [];
    state.expiresAt = 0;
    state.collectionsExpiresAt = 0;
    state.departmentsExpiresAt = 0;
    state.landingCollectionsExpiresAt = 0;
    state.productsPromise = null;
    state.collectionsPromise = null;
    state.departmentsPromise = null;
    state.landingCollectionsPromise = null;
    state.productPromises = {};
  },
  removeProduct(productId) {
    const key = String(productId || '').trim();

    if (!key || !state.products.length) {
      return;
    }

    applyProducts(state.products.filter(product => String(product.id) !== key));
  }
};
