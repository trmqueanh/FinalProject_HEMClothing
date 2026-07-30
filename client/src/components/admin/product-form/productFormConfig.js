// Chuẩn hóa dữ liệu form sản phẩm trước khi ProductForm hiển thị hoặc submit.
import { defaultHexForColorFamily, normalizeColorFamily, resolveColorHex } from '../../../helpers/colors';
import { sortSizeItems } from '../../../helpers/sizes';

export const DEFAULT_PRODUCT_FORM = {
  id: '',
  gender: 'women',
  name: '',
  slug: '',
  productGroup: 'clothing',
  category: 'tops',
  collection: '',
  style: '',
  heelHeight: '',
  status: 'active',
  pricingMode: 'regular',
  price: 0,
  originalPrice: 0,
  salePrice: null,
  description: '',
  fit: '',
  sleeveLength: '',
  garmentLength: '',
  neckline: '',
  waistRise: '',
  materials: [],
  materialInformationTitle: 'ADDITIONAL MATERIAL INFORMATION',
  materialInformationContent: '',
  colorVariants: []
};

export const HEEL_HEIGHT_OPTIONS = ['High heel', 'Mid heel', 'Low heel', 'No heel'];
export const MATERIAL_PART_OPTIONS = ['Main', 'Shell', 'Lining', 'Upper', 'Sole', 'Trim', 'Coating', 'Base fabric', 'Frame', 'Temple', 'Lens'];
export const ACCESSORY_SIZE_LABEL = 'One Size';

export const CLOTHING_SIZE_OPTIONS = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  '24',
  '25',
  '26',
  '27',
  '28',
  '29',
  '30',
  '31',
  '32',
  '33',
  '25-27',
  '28-30',
  '31-33',
  'One Size'
];

export const SHOE_SIZE_OPTIONS = [
  '35',
  '36',
  '37',
  '38',
  '39',
  '40',
  '41',
  '42',
  '43',
  '44',
  '45',
  '46'
];

export const DEFAULT_MATERIAL_INFORMATION_TITLE = 'ADDITIONAL MATERIAL INFORMATION';

export const isPantsCategoryValue = value => {
  const normalized = String(value || '').trim().toLowerCase();

  return [
    'pants',
    'trousers',
    'jeans',
    'shorts',
    'bottoms',
    'leggings',
    'joggers',
    'skirt',
    'skirts'
  ].some(keyword => normalized.includes(keyword));
};

export const makeProductLocalKey = prefix =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const createMaterialRow = overrides => ({
  localKey: makeProductLocalKey('material'),
  partName: 'Main',
  materialId: '',
  materialName: '',
  materialPercent: null,
  ...overrides
});

export const normalizeProductMaterials = product => {
  const source = Array.isArray(product && product.materials) ? product.materials : [];
  const rows = [];

  source.forEach((groupOrMaterial, groupIndex) => {
    if (typeof groupOrMaterial === 'string') {
      rows.push(createMaterialRow({
        partName: 'Main',
        materialName: groupOrMaterial,
        materialPercent: null
      }));
      return;
    }

    if (Array.isArray(groupOrMaterial && groupOrMaterial.materials)) {
      const partName = groupOrMaterial.partName || groupOrMaterial.part_name || 'Main';
      groupOrMaterial.materials.forEach((material, materialIndex) => {
        rows.push(createMaterialRow({
          localKey: `${groupOrMaterial.part_name || partName}-${material.material_id || material.name || materialIndex}-${groupIndex}`,
          partName,
          materialId: material.materialId || material.material_id || '',
          materialName: material.name || material.materialName || material.material_name || '',
          materialPercent: material.percent ?? material.materialPercent ?? material.material_percent ?? null
        }));
      });
      return;
    }

    if (groupOrMaterial && typeof groupOrMaterial === 'object') {
      rows.push(createMaterialRow({
        partName: groupOrMaterial.partName || groupOrMaterial.part_name || 'Main',
        materialId: groupOrMaterial.materialId || groupOrMaterial.material_id || '',
        materialName: groupOrMaterial.materialName || groupOrMaterial.material_name || groupOrMaterial.name || '',
        materialPercent: groupOrMaterial.materialPercent ?? groupOrMaterial.material_percent ?? groupOrMaterial.percent ?? null
      }));
    }
  });

  return rows.filter(row => String(row.materialName || '').trim());
};

export const normalizeProductMaterialInformation = product => {
  const info = product && (product.materialInformation || product.material_information) || {};
  const title = String(
    info.title ||
    product?.materialInformationTitle ||
    product?.material_information_title ||
    DEFAULT_MATERIAL_INFORMATION_TITLE
  ).trim() || DEFAULT_MATERIAL_INFORMATION_TITLE;
  const content = info.content ??
    info.highlight_text ??
    product?.materialInformationContent ??
    product?.material_information_content ??
    '';

  return {
    title,
    content: content === null || content === undefined ? '' : String(content)
  };
};

export const flattenCategoryOptions = categories =>
  (Array.isArray(categories) ? categories : []).reduce((accumulator, category) => {
    accumulator.push({
      id: category.id,
      name: category.slug || category.name,
      label: category.label || category.name
    });

    return accumulator;
  }, []);

export const normalizeProductPricingMode = product => {
  const mode = String(product.pricingMode || product.pricing_mode || '').trim();

  if (['regular', 'sale'].includes(mode)) {
    return mode;
  }

  if (product.isSale || product.is_sale) return 'sale';
  return 'regular';
};

export const normalizePrimaryImages = images => {
  const nextImages = (Array.isArray(images) ? images : []).map((image, index) => ({
    ...image,
    sortOrder: Number(image.sortOrder ?? index) || 0,
    isPrimary: Boolean(image.isPrimary)
  }));

  if (!nextImages.length) {
    return nextImages;
  }

  const primaryIndex = nextImages.findIndex(image => image.isPrimary);
  return nextImages.map((image, index) => ({
    ...image,
    isPrimary: primaryIndex >= 0 ? index === primaryIndex : index === 0
  }));
};

const normalizeProductImages = product =>
  (Array.isArray(product.productImages) ? product.productImages : []).map((image, index) => ({
    id: image.id || '',
    localKey: image.id || makeProductLocalKey('image'),
    colorVariantId: image.colorVariantId || image.color_variant_id || '',
    colorName: image.colorName || image.color_name || '',
    imageUrl: image.imageUrl || image.image_url || '',
    previewUrl: '',
    file: null,
    altText: image.altText || image.alt_text || product.name || '',
    isPrimary: Boolean(image.isPrimary || image.is_primary),
    sortOrder: Number(image.sortOrder ?? image.sort_order ?? index) || 0
  }));

export const buildProductColorVariants = product => {
  const inventoryItems = Array.isArray(product.inventoryItems) ? product.inventoryItems : [];
  const productImages = normalizeProductImages(product);
  const sourceColorVariants = [
    ...(Array.isArray(product.colorVariants) ? product.colorVariants : []),
    ...(Array.isArray(product.colors) ? product.colors : [])
  ];
  const colorPricingByKey = sourceColorVariants.reduce((map, color) => {
    const id = String(color.colorVariantId || color.color_variant_id || color.id || '').trim();
    const name = String(color.name || color.colorName || color.color_name || '').trim().toLowerCase();
    const payload = {
      salePrice: color.salePrice ?? color.sale_price ?? null
    };

    if (id) map.set(`id:${id}`, payload);
    if (name) map.set(`name:${name}`, payload);
    return map;
  }, new Map());
  const pricePayloadForColor = (id, name, fallback = {}) =>
    colorPricingByKey.get(`id:${String(id || '').trim()}`) ||
    colorPricingByKey.get(`name:${String(name || '').trim().toLowerCase()}`) ||
    fallback;
  const variantsByColor = new Map();

  inventoryItems.forEach(item => {
    const colorName = item.colorName || item.color_name || 'Black';
    const colorKey = colorName.toLowerCase();
    const family = item.colorFamily || item.color_family || normalizeColorFamily('', colorName);
    const hex = item.colorHex || item.color_hex || defaultHexForColorFamily(family);
    const pricing = pricePayloadForColor(item.colorVariantId || item.color_variant_id, colorName, item);

    if (!variantsByColor.has(colorKey)) {
      variantsByColor.set(colorKey, {
        localKey: makeProductLocalKey('color'),
        name: colorName,
        hex,
        family,
        familyManuallyEdited: false,
        hexManuallyEdited: Boolean(item.colorHex || item.color_hex),
        colorVariantId: item.colorVariantId || item.color_variant_id || '',
        productCode: item.productCode || item.product_code || item.articleNumber || item.article_number || '',
        productCodeManuallyEdited: Boolean(item.productCode || item.product_code || item.articleNumber || item.article_number),
        salePrice: pricing.salePrice ?? pricing.sale_price ?? null,
        images: [],
        sizes: [],
        customSizeInput: ''
      });
    }

    variantsByColor.get(colorKey).sizes.push({
      id: item.id || '',
      localKey: item.id || makeProductLocalKey('size'),
      sizeLabel: item.sizeLabel || item.size_label || '',
      stockQuantity: Number(item.stockQuantity ?? item.stock_quantity ?? 0) || 0,
      reservedQuantity: Number(item.reservedQuantity ?? item.reserved_quantity ?? 0) || 0,
      soldQuantity: Number(item.soldQuantity ?? item.sold_quantity ?? 0) || 0
    });
  });

  productImages.forEach(image => {
    const colorName = image.colorName || inventoryItems[0]?.colorName || inventoryItems[0]?.color_name || 'Black';
    const colorKey = colorName.toLowerCase();
    const family = image.colorFamily || image.color_family || normalizeColorFamily('', colorName);
    const pricing = pricePayloadForColor(image.colorVariantId || image.color_variant_id, colorName, image);

    if (!variantsByColor.has(colorKey)) {
      variantsByColor.set(colorKey, {
        localKey: makeProductLocalKey('color'),
        name: colorName,
        hex: defaultHexForColorFamily(family, resolveColorHex(colorName)),
        family,
        familyManuallyEdited: false,
        hexManuallyEdited: false,
        colorVariantId: image.colorVariantId || image.color_variant_id || '',
        productCode: image.productCode || image.product_code || image.articleNumber || image.article_number || '',
        productCodeManuallyEdited: Boolean(image.productCode || image.product_code || image.articleNumber || image.article_number),
        salePrice: pricing.salePrice ?? pricing.sale_price ?? null,
        images: [],
        sizes: [],
        customSizeInput: ''
      });
    }

    variantsByColor.get(colorKey).images.push({
      ...image,
      colorName
    });
  });

  if (!variantsByColor.size) {
    variantsByColor.set('black', {
      localKey: makeProductLocalKey('color'),
      name: 'Black',
      hex: '',
      family: 'Black',
      familyManuallyEdited: false,
      hexManuallyEdited: false,
      productCode: '',
      productCodeManuallyEdited: false,
      salePrice: null,
      images: [],
      sizes: [],
      customSizeInput: ''
    });
  }

  return [...variantsByColor.values()].map(color => ({
    ...color,
    images: normalizePrimaryImages(color.images),
    sizes: sortSizeItems(color.sizes.filter(size => String(size.sizeLabel || '').trim())),
    customSizeInput: color.customSizeInput || ''
  }));
};
