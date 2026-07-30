// Shop page config: static route labels, landing media, filter defaults, and small pure helpers.
export const HERO_VIDEOS = {
  women: [
    `${import.meta.env.BASE_URL}women-hero.mp4`,
    `${import.meta.env.BASE_URL}media/women-hero.mp4`
  ],
  men: [
    `${import.meta.env.BASE_URL}men-hero.mp4`,
    `${import.meta.env.BASE_URL}media/men-hero.mp4`
  ]
};

// Landing signature tiles: maps each department to the categories shown on the storefront landing.
export const SIGNATURE_CATEGORY_CONFIG = {
  women: [
    {
      label: 'T-Shirts',
      image: `${import.meta.env.BASE_URL}women_tshirts.jpg`,
      candidates: ['t-shirts', 'tshirt', 't-shirts & polos', 'tees', 't shirt']
    },
    { label: 'Pants', image: `${import.meta.env.BASE_URL}women_pants.jpg`, candidates: ['pants'] },
    { label: 'Skirts', image: `${import.meta.env.BASE_URL}women_skirt.jpg`, candidates: ['skirts', 'skirt'] },
    { label: 'Dresses', image: `${import.meta.env.BASE_URL}women_dress.jpg`, candidates: ['dresses', 'dress'] }
  ],
  men: [
    {
      label: 'T-Shirts',
      image: `${import.meta.env.BASE_URL}men_tshirts.jpg`,
      candidates: ['t-shirts', 'tshirt', 't-shirts & polos', 'tees', 't shirt']
    },
    { label: 'Shirts', image: `${import.meta.env.BASE_URL}men_shirts.jpg`, candidates: ['shirts', 'shirt'] },
    { label: 'Pants', image: `${import.meta.env.BASE_URL}men_pants.jpg`, candidates: ['pants'] },
    { label: 'Jeans', image: `${import.meta.env.BASE_URL}men_jeans.jpg`, candidates: ['jeans'] }
  ]
};

// Landing copy: text only, separated so Shop.vue focuses on route/filter behavior.
export const EDITORIAL_CONTENT = {
  women: {
    heroTitle: 'Refined simplicity.',
    heroSubtitle:
      'Modern essentials, effortless layers, and versatile pieces designed for everyday dressing.',
    copyEyebrow: 'Women',
    copyTitle: 'Designed for modern wardrobes.',
    copyBody:
      'Discover thoughtfully designed pieces that balance comfort, versatility, and timeless style. From relaxed shirts and soft knitwear to tailored trousers, dresses, skirts, and outerwear, each piece is created to fit seamlessly into everyday life and remain relevant season after season.',
    landingSubtitle:
      'Explore signature categories, wardrobe essentials, and timeless styles for women.',
    catalogTitle: 'Women collection.',
    catalogSubtitle:
      'Browse clothing, essentials, and everyday pieces designed for effortless dressing.'
  },
  men: {
    heroTitle: 'Modern essentials.',
    heroSubtitle:
      'Clean tailoring, relaxed silhouettes, and timeless wardrobe staples built for everyday wear.',
    copyEyebrow: 'Men',
    copyTitle: 'Built around everyday wear.',
    copyBody:
      'Explore a refined collection of shirts, T-shirts, trousers, knitwear, outerwear, and tailoring designed for modern living. Combining clean lines, practical comfort, and versatile styling, these pieces create a wardrobe that works across seasons and occasions.',
    landingSubtitle:
      'Explore signature categories, wardrobe essentials, and timeless styles for men.',
    catalogTitle: 'Men collection.',
    catalogSubtitle:
      'Browse clothing, essentials, and everyday pieces designed for modern dressing.'
  }
};

// Search key normalizer: makes category matching tolerant of punctuation and spacing.
export const normalizeMatchKey = value =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const slugifyRouteSegment = value =>
  normalizeMatchKey(value)
    .replace(/\s+/g, '-')
    .replace(/^-|-$/g, '');

// Newest sorter: shared by listing highlights and filtered catalog sorting.
export const byNewest = (left, right) => {
  const leftTimestamp = left && left.createdAt ? new Date(left.createdAt).getTime() : 0;
  const rightTimestamp = right && right.createdAt ? new Date(right.createdAt).getTime() : 0;
  return rightTimestamp - leftTimestamp;
};

// Identity normalizer: compares slugs, names, and labels without casing noise.
export const normalizeCategoryIdentity = value =>
  String(value || '')
    .trim()
    .toLowerCase();

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'discount-desc', label: 'Hot Deals' },
  { value: 'price-asc', label: 'Price low to high' },
  { value: 'price-desc', label: 'Price high to low' },
  { value: 'name', label: 'Alphabetical' }
];

export const GROUP_TO_BROWSE_VIEW = {
  all: 'all',
  bestseller: 'best',
  new_arrival: 'new',
  sale: 'sale'
};

export const BROWSE_VIEW_TO_GROUP = {
  landing: 'all',
  all: 'all',
  best: 'bestseller',
  bestseller: 'bestseller',
  new: 'new_arrival',
  new_arrival: 'new_arrival',
  sale: 'sale'
};

export const PRODUCT_GROUP_MENU_CONFIG = {
  women: [
    {
      slug: 'clothing',
      label: 'Clothing',
      categories: [
        { slug: 'dresses', label: 'Dresses' },
        { slug: 'tops', label: 'Tops' },
        { slug: 'pants', label: 'Pants' },
        { slug: 'skirts', label: 'Skirts' }
      ]
    },
    {
      slug: 'shoes',
      label: 'Shoes',
      categories: [
        { slug: 'sandals', label: 'Sandals' },
        { slug: 'heels', label: 'Heels' }
      ]
    },
    {
      slug: 'accessories',
      label: 'Accessories',
      categories: [
        { slug: 'bags', label: 'Bags' },
        { slug: 'hats', label: 'Hats' },
        { slug: 'jewelry', label: 'Jewelry' }
      ]
    }
  ],
  men: [
    {
      slug: 'clothing',
      label: 'Clothing',
      categories: [
        { slug: 't-shirts', label: 'T-Shirts' },
        { slug: 'shirts', label: 'Shirts' },
        { slug: 'polos', label: 'Polos' },
        { slug: 'pants', label: 'Pants' },
        { slug: 'jackets', label: 'Jackets' }
      ]
    },
    {
      slug: 'shoes',
      label: 'Shoes',
      categories: [
        { slug: 'sneakers', label: 'Sneakers' },
        { slug: 'dress-shoes', label: 'Dress Shoes' },
        { slug: 'loafers', label: 'Loafers' },
        { slug: 'sandals', label: 'Sandals' },
        { slug: 'mules', label: 'Mules' }
      ]
    },
    {
      slug: 'accessories',
      label: 'Accessories',
      categories: [
        { slug: 'bags', label: 'Bags' },
        { slug: 'hats', label: 'Hats' },
        { slug: 'belts', label: 'Belts' }
      ]
    }
  ]
};

export const PRODUCT_GROUP_SLUGS = PRODUCT_GROUP_MENU_CONFIG.women.map(group => group.slug);

const toTitleLabel = value =>
  String(value || '')
    .split(/[\s-]+/)
    .filter(Boolean)
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');

const normalizeDepartmentKey = department => (String(department || '').trim().toLowerCase() === 'men' ? 'men' : 'women');

export const categoryRouteSlug = (department, category) => {
  const rawSlug = String(
    category && typeof category === 'object'
      ? category.slug || category.name || category.label || ''
      : category || ''
  ).trim();
  const departmentKey = normalizeDepartmentKey(department);
  const departmentPrefix = `${departmentKey}-`;

  return rawSlug.toLowerCase().startsWith(departmentPrefix)
    ? slugifyRouteSegment(rawSlug.slice(departmentPrefix.length))
    : slugifyRouteSegment(rawSlug);
};

const normalizeConfigCategory = (category, group) => ({
  id: String(category.id || `${group.slug}-${category.slug || category.name || category.label}`),
  name: String(category.slug || category.name || category.label || '').trim(),
  label: String(category.label || category.name || category.slug || '').trim(),
  slug: String(category.slug || category.name || category.label || '').trim(),
  productGroupId: String(group.id || group.slug || '').trim(),
  productGroup: String(group.name || group.slug || '').trim(),
  productGroupLabel: String(group.label || group.name || '').trim(),
  productGroupSlug: String(group.slug || group.name || '').trim(),
  productCount: Number(category.productCount || category.product_count || 0)
});

const normalizeConfigGroup = group => ({
  id: String(group.id || group.slug || group.name || '').trim(),
  name: String(group.name || group.slug || '').trim(),
  label: String(group.label || group.name || group.slug || '').trim(),
  slug: String(group.slug || group.name || '').trim(),
  sortOrder: Number(group.sortOrder || group.sort_order || 0),
  categories: []
});

const categoryKey = category =>
  normalizeCategoryIdentity(category.slug || category.name || category.label);

const groupKey = group =>
  normalizeCategoryIdentity(group.slug || group.name || group.label);

export const mergeProductGroups = (department, groups = [], flatCategories = []) => {
  const configuredGroups = PRODUCT_GROUP_MENU_CONFIG[normalizeDepartmentKey(department)] || [];
  const sourceGroups = Array.isArray(groups) ? groups.filter(group => group && (group.slug || group.name || group.label)) : [];
  const sourceCategories = Array.isArray(flatCategories)
    ? flatCategories.filter(category => category && (category.productGroupSlug || category.productGroup || category.productGroupLabel))
    : [];
  const hasDatabaseGroups = sourceGroups.length > 0 || sourceCategories.length > 0;
  const groupsByKey = new Map();
  const addGroup = rawGroup => {
    const normalizedGroup = normalizeConfigGroup(rawGroup);
    const key = groupKey(normalizedGroup);

    if (!key) return null;

    if (!groupsByKey.has(key)) {
      groupsByKey.set(key, {
        ...normalizedGroup,
        categories: []
      });
    }

    const group = groupsByKey.get(key);
    group.id = group.id || normalizedGroup.id;
    group.name = group.name || normalizedGroup.name || key;
    group.label = group.label || normalizedGroup.label || toTitleLabel(key);
    group.slug = group.slug || normalizedGroup.slug || key;
    group.sortOrder = Number.isFinite(normalizedGroup.sortOrder) ? normalizedGroup.sortOrder : group.sortOrder;
    return group;
  };
  const addCategory = (group, rawCategory = {}) => {
    if (!group) return;

    const category = normalizeConfigCategory(rawCategory, group);
    const key = categoryKey(category);
    const labels = [category.slug, category.name, category.label]
      .map(normalizeCategoryIdentity)
      .filter(Boolean);

    if (
      !key ||
      group.categories.some(item =>
        labels.some(label =>
          [item.slug, item.name, item.label]
            .map(normalizeCategoryIdentity)
            .includes(label)
        )
      )
    ) {
      return;
    }

    group.categories.push(category);
  };

  sourceGroups.forEach(rawGroup => {
    const group = addGroup(rawGroup);
    (Array.isArray(rawGroup.categories) ? rawGroup.categories : []).forEach(category => addCategory(group, category));
  });

  sourceCategories.forEach(category => {
    const categoryGroupSlug = String(category.productGroupSlug || category.productGroup || '').trim();
    const group = categoryGroupSlug ? addGroup({
      slug: categoryGroupSlug,
      name: category.productGroup || categoryGroupSlug,
      label: category.productGroupLabel || categoryGroupSlug
    }) : null;

    addCategory(group, category);
  });

  if (!hasDatabaseGroups) {
    configuredGroups.forEach((rawGroup, index) => {
      const group = addGroup({
        ...rawGroup,
        sortOrder: index + 1
      });

      (rawGroup.categories || []).forEach(category => addCategory(group, category));
    });
  }

  return [...groupsByKey.values()]
    .sort((left, right) => (left.sortOrder - right.sortOrder) || left.label.localeCompare(right.label))
    .map(group => ({
      ...group,
      categories: [...group.categories]
    }));
};

// Special page map: first-class storefront pages like /women/sale and /men/new-arrivals.
export const SPECIAL_PAGE_CONFIG = {
  'new-arrivals': { browseView: 'new', label: 'New Arrivals' },
  bestsellers: { browseView: 'best', label: 'Bestsellers' },
  'best-sellers': { browseView: 'best', label: 'Bestsellers' },
  sale: { browseView: 'sale', label: 'Sale' }
};

export const BROWSE_VIEW_TO_SPECIAL_SEGMENT = {
  new: 'new-arrivals',
  best: 'bestsellers',
  sale: 'sale'
};

export const ALL_PRODUCTS_SEGMENT = 'all-products';
export const PRODUCTS_PER_PAGE = 20;

export const normalizePageNumber = value => {
  const nextValue = Number.parseInt(value, 10);
  return Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 1;
};
