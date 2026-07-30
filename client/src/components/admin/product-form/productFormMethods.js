// Logic sự kiện của ProductForm.vue; template và scoped CSS vẫn nằm trong component.
import { catalogStore } from '../../../stores/catalogStore';
import { adminApi } from '../../../services/adminApi';
import { defaultHexForColorFamily, isValidColorHex, normalizeColorFamily } from '../../../helpers/colors';
import { generateProductCode, normalizeProductCode } from '../../../helpers/productCodes';
import { sortSizeItems } from '../../../helpers/sizes';
import {
  DEFAULT_PRODUCT_FORM,
  ACCESSORY_SIZE_LABEL,
  buildProductColorVariants,
  createMaterialRow,
  DEFAULT_MATERIAL_INFORMATION_TITLE,
  makeProductLocalKey,
  normalizeProductMaterialInformation,
  normalizeProductMaterials,
  normalizePrimaryImages,
  normalizeProductPricingMode,
  isPantsCategoryValue
} from './productFormConfig';

const normalizeOptionIdentity = value => String(value || '').trim().toLowerCase();

export const productFormMethods = {
    preventNumberInputWheel(event) {
      const target = event && event.target;

      if (
        !target ||
        typeof target.matches !== 'function' ||
        !target.matches('input[type="number"]') ||
        document.activeElement !== target
      ) {
        return;
      }

      event.preventDefault();
      target.blur();
    },
    updateFormField({ field, value } = {}) {
      if (!Object.prototype.hasOwnProperty.call(this.form, field)) {
        return;
      }

      this.form[field] = value;

      if (['gender', 'productGroup', 'category', 'name'].includes(field)) {
        this.refreshAutoProductCodes();
      }
    },
    normalizeScopedSelections() {
      if (this.selectedProductGroupSlug !== 'clothing') {
        this.form.fit = '';
        this.form.sleeveLength = '';
        this.form.garmentLength = '';
        this.form.neckline = '';
        this.form.waistRise = '';
      } else if (this.isPantsClothingCategory) {
        this.form.sleeveLength = '';
        this.form.neckline = '';
      } else {
        this.form.waistRise = '';
      }

      if (
        this.selectedProductGroupSlug === 'clothing' &&
        this.form.fit &&
        this.filteredFitOptions.length &&
        !this.filteredFitOptions.some(option => option.name === this.form.fit)
      ) {
        this.form.fit = '';
      }

      if (this.selectedProductGroupSlug !== 'shoes') {
        this.form.heelHeight = '';
      }
    },
    syncCategoryWithOptions({ allowFallback = false } = {}) {
      const options = Array.isArray(this.categoryOptions) ? this.categoryOptions : [];

      if (!options.length) {
        return;
      }

      const currentCategory = String(this.form.category || '').trim();
      const currentKey = normalizeOptionIdentity(currentCategory);
      const matchedOption = options.find(option => {
        const optionValues = [
          option.name,
          option.slug,
          option.label,
          option.id
        ].map(normalizeOptionIdentity);

        return optionValues.includes(currentKey);
      });

      if (matchedOption) {
        this.form.category = matchedOption.name;
        return;
      }

      if (allowFallback) {
        this.form.category = options[0].name;
      }
    },
    syncProductGroupWithOptions({ allowFallback = false } = {}) {
      const options = Array.isArray(this.productGroupOptions) ? this.productGroupOptions : [];

      if (!options.length) {
        return;
      }

      const currentGroup = String(this.form.productGroup || '').trim();
      const currentKey = normalizeOptionIdentity(currentGroup);
      const matchedOption = options.find(option => {
        const optionValues = [
          option.name,
          option.slug,
          option.label,
          option.id
        ].map(normalizeOptionIdentity);

        return optionValues.includes(currentKey);
      });

      if (matchedOption) {
        this.form.productGroup = matchedOption.name;
        return;
      }

      if (allowFallback) {
        this.form.productGroup = options[0].name;
      }
    },
    updateCustomSizeInput(colorIndex, value) {
      const color = this.form.colorVariants[colorIndex];

      if (!color) {
        return;
      }

      color.customSizeInput = value;
    },
    buildForm(product) {
      const nextProduct = product || {};
      const pricingMode = normalizeProductPricingMode(nextProduct);
      const price = Number(nextProduct.price || 0);
      const originalPrice = Number(nextProduct.originalPrice ?? nextProduct.original_price ?? price) || price;
      const materialInformation = normalizeProductMaterialInformation(nextProduct);
      const category = nextProduct.categorySlug || nextProduct.category || DEFAULT_PRODUCT_FORM.category;
      const isPantsCategory = isPantsCategoryValue(category);

      return {
        ...DEFAULT_PRODUCT_FORM,
        id: nextProduct.id || '',
        gender: nextProduct.gender || DEFAULT_PRODUCT_FORM.gender,
        name: nextProduct.name || '',
        slug: nextProduct.slug || '',
        productGroup: nextProduct.productGroupSlug || nextProduct.productGroup || DEFAULT_PRODUCT_FORM.productGroup,
        category,
        collection: nextProduct.collectionSlug || nextProduct.collection || '',
        style: nextProduct.styleName || nextProduct.style_name || '',
        heelHeight: nextProduct.heelHeight || nextProduct.heel_height || '',
        status: nextProduct.status || DEFAULT_PRODUCT_FORM.status,
        pricingMode,
        price,
        originalPrice,
        salePrice: nextProduct.salePrice ?? nextProduct.sale_price ?? null,
        description: nextProduct.description || '',
        fit: nextProduct.fitName || nextProduct.fit_name || nextProduct.fit || '',
        sleeveLength: nextProduct.sleeveLength || nextProduct.sleeve_length || '',
        garmentLength: nextProduct.garmentLength || nextProduct.garment_length || nextProduct.length || '',
        neckline: nextProduct.neckline || '',
        waistRise: nextProduct.waistRise || nextProduct.waist_rise || (isPantsCategory ? nextProduct.neckline : '') || '',
        materials: normalizeProductMaterials(nextProduct),
        materialInformationTitle: materialInformation.title,
        materialInformationContent: materialInformation.content,
        colorVariants: buildProductColorVariants(nextProduct)
      };
    },
    addMaterialRow() {
      this.form.materials.push(createMaterialRow());
    },
    removeMaterialRow(index) {
      this.form.materials.splice(index, 1);
    },
    updateMaterialRow({ index, field, value } = {}) {
      const row = this.form.materials[index];

      if (!row || !Object.prototype.hasOwnProperty.call(row, field)) {
        return;
      }

      row[field] = value;

      if (field === 'materialId') {
        const selectedMaterial = this.filteredMaterialOptions.find(option => option.id === value);
        row.materialName = selectedMaterial ? selectedMaterial.name : '';
      }

      if (field === 'materialName') {
        const normalizedValue = String(value || '').trim().toLowerCase();
        const selectedMaterial = this.filteredMaterialOptions.find(option =>
          String(option.name || '').trim().toLowerCase() === normalizedValue
        );

        row.materialId = selectedMaterial ? selectedMaterial.id : '';
      }
    },
    revokePreviewUrls() {
      this.form.colorVariants.forEach(color => {
        color.images.forEach(image => {
          if (image.previewUrl) {
            URL.revokeObjectURL(image.previewUrl);
          }
        });
      });
    },
    addColorVariant() {
      const family = 'Black';
      this.form.colorVariants.push({
        localKey: makeProductLocalKey('color'),
        name: '',
        hex: '',
        family,
        familyManuallyEdited: false,
        hexManuallyEdited: false,
        productCode: '',
        productCodeManuallyEdited: false,
        colorVariantId: '',
        salePrice: null,
        images: [],
        sizes: [],
        customSizeInput: ''
      });
      this.refreshAutoProductCodes();
    },
    removeColorVariant(colorIndex) {
      if (this.form.colorVariants.length <= 1) return;

      this.form.colorVariants[colorIndex].images.forEach(image => {
        if (image.previewUrl) URL.revokeObjectURL(image.previewUrl);
      });
      this.form.colorVariants.splice(colorIndex, 1);
      this.refreshAutoProductCodes();
    },
    productCodeContext() {
      const selectedCategory = this.selectedCategoryOption || {};

      return {
        gender: this.form.gender,
        productGroup: this.form.productGroup,
        category: selectedCategory.name || this.form.category,
        categoryLabel: selectedCategory.label || selectedCategory.name || this.form.category,
        productId: this.form.id,
        productName: this.form.name
      };
    },
    generatedProductCodeForColor(color) {
      return generateProductCode({
        ...this.productCodeContext(),
        colorName: color && color.name,
        colorFamily: normalizeColorFamily(color && color.family, color && color.name)
      });
    },
    refreshAutoProductCodes() {
      this.form.colorVariants.forEach(color => {
        if (!color.productCodeManuallyEdited) {
          color.productCode = this.generatedProductCodeForColor(color);
        }
      });
    },
    colorProductCode(color) {
      const manualCode = normalizeProductCode(color && color.productCode);

      return color && color.productCodeManuallyEdited
        ? manualCode
        : this.generatedProductCodeForColor(color);
    },
    colorCodeKey(color, index) {
      return color && color.localKey
        ? color.localKey
        : `${String(color && color.name || '').trim().toLowerCase()}__${index}`;
    },
    buildUniqueColorCodeMap() {
      const usedCodes = new Set();
      const codeMap = new Map();

      this.form.colorVariants.forEach((color, index) => {
        const baseCode = this.colorProductCode(color);
        let productCode = baseCode;
        let codeKey = productCode.toLowerCase();
        let suffix = 2;

        while (usedCodes.has(codeKey)) {
          productCode = `${baseCode}-${suffix}`;
          codeKey = productCode.toLowerCase();
          suffix += 1;
        }

        usedCodes.add(codeKey);
        codeMap.set(this.colorCodeKey(color, index), productCode);
      });

      return codeMap;
    },
    updateProductCode(colorIndex, value) {
      const color = this.form.colorVariants[colorIndex];
      if (!color) return;

      const code = normalizeProductCode(value);
      color.productCodeManuallyEdited = Boolean(code);
      color.productCode = code || this.generatedProductCodeForColor(color);
    },
    syncColorImageNames(colorIndex) {
      const color = this.form.colorVariants[colorIndex];
      if (!color) return;

      if (!color.familyManuallyEdited) {
        color.family = normalizeColorFamily('', color.name);
      }

      if (!color.hexManuallyEdited) {
        color.hex = defaultHexForColorFamily(color.family);
      }

      color.images = color.images.map(image => ({
        ...image,
        colorName: color.name,
        colorVariantId: color.colorVariantId || color.id || image.colorVariantId || ''
      }));
      this.refreshAutoProductCodes();
    },
    updateColorFamily(colorIndex, value) {
      const color = this.form.colorVariants[colorIndex];
      if (!color) return;

      color.family = normalizeColorFamily(value, color.name);
      color.familyManuallyEdited = true;

      if (!color.hexManuallyEdited) {
        color.hex = defaultHexForColorFamily(color.family);
      }

      this.refreshAutoProductCodes();
    },
    updateColorHex(colorIndex, value) {
      const color = this.form.colorVariants[colorIndex];
      if (!color) return;

      color.hex = String(value || '').trim();
      color.hexManuallyEdited = Boolean(color.hex);
    },
    updateColorPrice(colorIndex, field, value) {
      const color = this.form.colorVariants[colorIndex];
      if (!color || field !== 'salePrice') return;

      if (value === null || value === undefined || value === '') {
        color[field] = null;
        return;
      }

      const nextValue = Number(value);
      color[field] = Number.isFinite(nextValue) ? nextValue : value;
    },
    handleColorImageFiles(event, colorIndex) {
      const color = this.form.colorVariants[colorIndex];
      const files = event && event.target && event.target.files ? [...event.target.files] : [];

      if (!color || !files.length) {
        return;
      }

      const newImages = files.map((file, fileIndex) => ({
        localKey: makeProductLocalKey('image'),
        id: '',
        colorVariantId: color.colorVariantId || color.id || '',
        colorName: color.name,
        imageUrl: '',
        previewUrl: URL.createObjectURL(file),
        file,
        altText: this.form.name ? `${this.form.name} ${color.name}`.trim() : 'Product image',
        isPrimary: !color.images.length && fileIndex === 0,
        sortOrder: color.images.length + fileIndex
      }));

      color.images = normalizePrimaryImages([...color.images, ...newImages]);
      event.target.value = '';
    },
    setPrimaryImage(colorIndex, imageIndex) {
      const color = this.form.colorVariants[colorIndex];
      if (!color) return;

      color.images = color.images.map((image, index) => ({
        ...image,
        isPrimary: index === imageIndex
      }));
    },
    removeColorImage(colorIndex, imageIndex) {
      const color = this.form.colorVariants[colorIndex];
      if (!color) return;

      const image = color.images[imageIndex];
      if (image && image.previewUrl) URL.revokeObjectURL(image.previewUrl);
      color.images.splice(imageIndex, 1);
      color.images = normalizePrimaryImages(color.images);
    },
    normalizeSizeLabel(sizeLabel) {
      return String(sizeLabel || '').trim().replace(/\s+/g, ' ');
    },
    isSizeSelected(color, sizeLabel) {
      const normalizedSize = this.normalizeSizeLabel(sizeLabel).toLowerCase();
      return Boolean(
        color &&
        Array.isArray(color.sizes) &&
        color.sizes.some(size => this.normalizeSizeLabel(size.sizeLabel).toLowerCase() === normalizedSize)
      );
    },
    addSize(colorIndex, sizeLabel = '') {
      const color = this.form.colorVariants[colorIndex];
      if (!color) return;

      const normalizedSize = this.normalizeSizeLabel(sizeLabel);
      if (!normalizedSize) return;

      if (this.isSizeSelected(color, normalizedSize)) {
        this.errorMessage = 'This size already exists for this color.';
        return;
      }

      color.sizes.push({
        localKey: makeProductLocalKey('size'),
        sizeLabel: normalizedSize,
        stockQuantity: 0,
        reservedQuantity: 0,
        soldQuantity: 0
      });
      color.sizes = sortSizeItems(color.sizes);
      this.errorMessage = '';
    },
    addSizeFromOption(colorIndex, sizeLabel) {
      this.addSize(colorIndex, sizeLabel);
    },
    addCustomSize(colorIndex) {
      const color = this.form.colorVariants[colorIndex];
      if (!color) return;

      const customSize = this.normalizeSizeLabel(color.customSizeInput);
      if (!customSize) {
        this.errorMessage = 'Please enter a custom size before adding it.';
        return;
      }

      this.addSize(colorIndex, customSize);

      if (!this.errorMessage) {
        color.customSizeInput = '';
      }
    },
    removeSize(colorIndex, sizeIndex) {
      const color = this.form.colorVariants[colorIndex];
      if (!color) return;
      color.sizes.splice(sizeIndex, 1);
    },
    accessorySizeRow(color) {
      const sizes = Array.isArray(color && color.sizes) ? color.sizes : [];
      const existingOneSize = sizes.find(size =>
        this.normalizeSizeLabel(size.sizeLabel).toLowerCase() === ACCESSORY_SIZE_LABEL.toLowerCase()
      );
      const fallbackSize = sizes[0] || {};

      return {
        ...fallbackSize,
        ...existingOneSize,
        localKey: existingOneSize?.localKey || fallbackSize.localKey || makeProductLocalKey('size'),
        sizeLabel: ACCESSORY_SIZE_LABEL,
        stockQuantity: Math.max(0, Number.parseInt(existingOneSize?.stockQuantity ?? fallbackSize.stockQuantity ?? 0, 10) || 0),
        reservedQuantity: Math.max(0, Number.parseInt(existingOneSize?.reservedQuantity ?? fallbackSize.reservedQuantity ?? 0, 10) || 0),
        soldQuantity: Math.max(0, Number.parseInt(existingOneSize?.soldQuantity ?? fallbackSize.soldQuantity ?? 0, 10) || 0)
      };
    },
    updateAccessoryStock(colorIndex, value) {
      const color = this.form.colorVariants[colorIndex];
      if (!color) return;

      const stockQuantity = Math.max(0, Number.parseInt(value, 10) || 0);
      const row = this.accessorySizeRow(color);

      color.sizes = [{
        ...row,
        stockQuantity
      }];
    },
    buildColorVariants() {
      const colorCodeMap = this.buildUniqueColorCodeMap();

      return this.form.colorVariants.map((color, index) => {
        const productCode = colorCodeMap.get(this.colorCodeKey(color, index)) || this.colorProductCode(color);

        return {
          id: color.colorVariantId || color.id || '',
          colorVariantId: color.colorVariantId || color.id || '',
          name: color.name.trim(),
          hex: color.hex && isValidColorHex(color.hex)
            ? color.hex
            : defaultHexForColorFamily(normalizeColorFamily(color.family, color.name)),
          family: normalizeColorFamily(color.family, color.name),
          colorFamily: normalizeColorFamily(color.family, color.name),
          color_family: normalizeColorFamily(color.family, color.name),
          productCode,
          product_code: productCode,
          salePrice: color.salePrice === '' || color.salePrice === null || color.salePrice === undefined
            ? null
            : Number(color.salePrice),
          sale_price: color.salePrice === '' || color.salePrice === null || color.salePrice === undefined
            ? null
            : Number(color.salePrice),
          productCodeAutoGenerated: !color.productCodeManuallyEdited,
          product_code_auto_generated: !color.productCodeManuallyEdited,
          sortOrder: index,
          sort_order: index
        };
      });
    },
    buildInventoryItems() {
      const colorCodeMap = this.buildUniqueColorCodeMap();
      const isAccessories = this.selectedProductGroupSlug === 'accessories';

      return this.form.colorVariants.flatMap((color, colorIndex) => {
        const sizeRows = isAccessories
          ? [this.accessorySizeRow(color)]
          : sortSizeItems(color.sizes);

        return sizeRows.map(size => ({
          id: size.id || '',
          colorVariantId: color.colorVariantId || color.id || '',
          colorName: color.name.trim(),
          colorHex: color.hex && isValidColorHex(color.hex)
            ? color.hex
            : defaultHexForColorFamily(normalizeColorFamily(color.family, color.name)),
          colorFamily: normalizeColorFamily(color.family, color.name),
          color_family: normalizeColorFamily(color.family, color.name),
          productCode: colorCodeMap.get(this.colorCodeKey(color, colorIndex)) || this.colorProductCode(color),
          sizeLabel: String(size.sizeLabel || '').trim(),
          stockQuantity: Math.max(0, Number.parseInt(size.stockQuantity, 10) || 0),
          reservedQuantity: Math.max(0, Number.parseInt(size.reservedQuantity, 10) || 0),
          soldQuantity: Math.max(0, Number.parseInt(size.soldQuantity, 10) || 0)
        }));
      });
    },
    buildProductImages() {
      return this.form.colorVariants.flatMap(color =>
        normalizePrimaryImages(color.images).map((image, index) => ({
          id: image.id || '',
          colorVariantId: color.colorVariantId || color.id || image.colorVariantId || '',
          colorName: color.name.trim(),
          imageUrl: image.imageUrl || '',
          previewUrl: image.previewUrl || '',
          file: image.file || null,
          altText: image.altText || this.form.name,
          isPrimary: image.isPrimary,
          sortOrder: index
        }))
      );
    },
    validateInventoryItems(inventoryItems) {
      const variantKeys = new Set();

      for (const item of inventoryItems) {
        if (!item.colorName || !item.sizeLabel) {
          return 'Every variant needs a color name and size label.';
        }

        const key = `${item.colorName.toLowerCase()}__${item.sizeLabel.toLowerCase()}`;
        if (variantKeys.has(key)) {
          return 'This color and size already exists for this product.';
        }
        variantKeys.add(key);
      }

      return '';
    },
    validateColorVariants(colorVariants) {
      const colorKeys = new Set();
      const codeKeys = new Set();

      for (const color of colorVariants) {
        if (!color.name) {
          return 'Every color needs a color name.';
        }

        const colorKey = color.name.toLowerCase();
        if (colorKeys.has(colorKey)) {
          return 'Each color name must be unique.';
        }
        colorKeys.add(colorKey);

        if (!color.productCode) {
          return 'Every color needs a product code.';
        }

        const originalPrice = Number(this.form.originalPrice);
        const salePrice = color.salePrice === null || color.salePrice === undefined || color.salePrice === ''
          ? null
          : Number(color.salePrice);

        if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0)) {
          return `Sale price for ${color.name} must be greater than or equal to 0.`;
        }

        if (salePrice !== null && Number.isFinite(originalPrice) && originalPrice > 0 && salePrice >= originalPrice) {
          return `Sale price for ${color.name} must be lower than the original price.`;
        }

        const codeKey = color.productCode.toLowerCase();
        if (codeKeys.has(codeKey)) {
          return 'Each color product code must be unique.';
        }
        codeKeys.add(codeKey);
      }

      return '';
    },
    validateManualColorHexInputs() {
      for (const color of this.form.colorVariants) {
        const hex = String(color.hex || '').trim();

        if (hex && !isValidColorHex(hex)) {
          return `Color hex for ${color.name || 'this color'} must be a valid hex value.`;
        }
      }

      return '';
    },
    buildMaterialRows() {
      return this.form.materials
        .map((row, index) => {
          const materialName = String(row.materialName || '').trim();
          const materialId = String(row.materialId || '').trim();

          if (!materialName && !materialId) {
            return null;
          }

          return {
            part_name: row.partName || 'Main',
            partName: row.partName || 'Main',
            material_id: materialId || null,
            materialId: materialId,
            material_name: materialName,
            materialName,
            material_percent: row.materialPercent === '' || row.materialPercent === null || row.materialPercent === undefined
              ? null
              : Number(row.materialPercent),
            materialPercent: row.materialPercent === '' || row.materialPercent === null || row.materialPercent === undefined
              ? null
              : Number(row.materialPercent),
            sortOrder: index,
            sort_order: index
          };
        })
        .filter(Boolean);
    },
    validateMaterials(materials) {
      const invalidNamePattern = /(composition|shell:|lining:|upper:|sole:|trim:|[0-9]+%)/i;

      for (const material of materials) {
        if (!material.material_name) {
          return 'Please select a material for every material row.';
        }

        if (invalidNamePattern.test(material.material_name)) {
          return 'Material name must be clean. Do not include part labels or percentages.';
        }

        if (
          material.material_percent !== null &&
          (!Number.isFinite(material.material_percent) || material.material_percent < 0 || material.material_percent > 100)
        ) {
          return 'Material percent must be between 0 and 100.';
        }
      }

      return '';
    },
    onSubmit() {
      if (this.isSubmitting) {
        return;
      }

      if (!this.form.name.trim() || !this.form.description.trim()) {
        this.errorMessage = 'Please fill in the name and description before saving.';
        return;
      }

      if (!this.form.colorVariants.length) {
        this.errorMessage = 'Please add at least one product color.';
        return;
      }

      if (this.selectedProductGroupSlug === 'shoes' && !this.form.heelHeight) {
        this.errorMessage = 'Please select a heel height for this shoe product.';
        return;
      }

      const colorHexError = this.validateManualColorHexInputs();
      if (colorHexError) {
        this.errorMessage = colorHexError;
        return;
      }

      const inventoryItems = this.buildInventoryItems();
      const colorVariants = this.buildColorVariants();
      if (!inventoryItems.length) {
        this.errorMessage = 'Please choose at least one size and stock row before saving.';
        return;
      }

      const colorError = this.validateColorVariants(colorVariants);
      if (colorError) {
        this.errorMessage = colorError;
        return;
      }

      const inventoryError = this.validateInventoryItems(inventoryItems);
      if (inventoryError) {
        this.errorMessage = inventoryError;
        return;
      }

      const materials = this.buildMaterialRows();
      const materialError = this.validateMaterials(materials);
      if (materialError) {
        this.errorMessage = materialError;
        return;
      }

      const pricingMode = this.form.pricingMode;
      const originalPrice = Number(this.form.originalPrice);
      const salePrice = pricingMode === 'sale' ? Number(this.form.salePrice) : null;

      if (!Number.isFinite(originalPrice) || originalPrice < 0) {
        this.errorMessage = 'Original price must be greater than or equal to 0.';
        return;
      }

      if (pricingMode === 'sale' && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= originalPrice)) {
        this.errorMessage = 'Sale price is required and must be lower than the original price.';
        return;
      }

      this.errorMessage = '';
      const productImages = this.buildProductImages();
      const isPantsClothing = this.isPantsClothingCategory;

      this.$emit('createOrUpdate', {
        id: this.form.id || undefined,
        gender: this.form.gender,
        name: this.form.name.trim(),
        slug: this.form.slug.trim(),
        productGroup: this.form.productGroup,
        product_group: this.form.productGroup,
        category: this.form.category,
        collection: this.form.collection,
        styleName: this.form.style,
        heelHeight: this.selectedProductGroupSlug === 'shoes' ? this.form.heelHeight : null,
        heel_height: this.selectedProductGroupSlug === 'shoes' ? this.form.heelHeight : null,
        status: this.form.status,
        pricingMode,
        pricing_mode: pricingMode,
        originalPrice,
        original_price: originalPrice,
        salePrice: pricingMode === 'sale' ? salePrice : null,
        sale_price: pricingMode === 'sale' ? salePrice : null,
        isSale: pricingMode === 'sale',
        is_sale: pricingMode === 'sale',
        description: this.form.description.trim(),
        fit: this.selectedProductGroupSlug === 'clothing' ? this.form.fit.trim() : '',
        sleeveLength: this.selectedProductGroupSlug === 'clothing' && !isPantsClothing ? this.form.sleeveLength.trim() : '',
        sleeve_length: this.selectedProductGroupSlug === 'clothing' && !isPantsClothing ? this.form.sleeveLength.trim() : '',
        garmentLength: this.selectedProductGroupSlug === 'clothing' ? this.form.garmentLength.trim() : '',
        garment_length: this.selectedProductGroupSlug === 'clothing' ? this.form.garmentLength.trim() : '',
        neckline: this.selectedProductGroupSlug === 'clothing' && !isPantsClothing ? this.form.neckline.trim() : '',
        waistRise: this.selectedProductGroupSlug === 'clothing' && isPantsClothing ? this.form.waistRise.trim() : '',
        waist_rise: this.selectedProductGroupSlug === 'clothing' && isPantsClothing ? this.form.waistRise.trim() : '',
        materials,
        materialInformation: {
          title: String(this.form.materialInformationTitle || DEFAULT_MATERIAL_INFORMATION_TITLE).trim() ||
            DEFAULT_MATERIAL_INFORMATION_TITLE,
          content: this.form.materialInformationContent
        },
        colorVariants,
        color_variants: colorVariants,
        inventoryItems,
        productImages
      });
    },
    async loadDepartments() {
      const [departments, collections, productGroupsResponse, categoriesResponse, stylesResponse, fitsResponse, materialsResponse] = await Promise.all([
        catalogStore.getDepartments(),
        catalogStore.getCollections(),
        adminApi.getAdminProductGroups(),
        adminApi.getAdminCategories({
          page: 1,
          limit: 200
        }),
        adminApi.getAdminStyles(),
        adminApi.getAdminFits(),
        adminApi.getAdminMaterials()
      ]);
      this.departments = Array.isArray(departments) ? departments : [];
      this.collectionOptions = Array.isArray(collections) ? collections : [];
      this.productGroups = productGroupsResponse && Array.isArray(productGroupsResponse.items)
        ? productGroupsResponse.items
        : [];
      this.adminCategoryOptions = categoriesResponse && Array.isArray(categoriesResponse.items)
        ? categoriesResponse.items
        : [];
      this.styleOptions = stylesResponse && Array.isArray(stylesResponse.items)
        ? stylesResponse.items
        : [];
      this.fitOptions = fitsResponse && Array.isArray(fitsResponse.items)
        ? fitsResponse.items
        : [];
      this.materialOptions = materialsResponse && Array.isArray(materialsResponse.items)
        ? materialsResponse.items
        : [];

      this.hasLoadedProductReferences = true;
      this.syncProductGroupWithOptions({ allowFallback: true });
      this.syncCategoryWithOptions({ allowFallback: true });

      this.normalizeScopedSelections();
      this.refreshAutoProductCodes();
    }
  };
