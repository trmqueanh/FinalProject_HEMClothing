import { flash } from '../../../helpers/flash';
import { sortSizeItems } from '../../../helpers/sizes';
import { adminApi } from '../../../services/adminApi';

// Admin product preview data and inventory summaries.
export const adminDashboardPreviewMethods = {
previewImages(product) {
      return Array.isArray(product && product.productImages) ? product.productImages : [];
    },
previewVariants(product) {
      return Array.isArray(product && product.inventoryItems) ? product.inventoryItems : [];
    },
previewPricingMode(product) {
      const mode = String(product && (product.pricingMode || product.pricing_mode) || '').toLowerCase();

      if (['regular', 'sale'].includes(mode)) {
        return mode;
      }

      if (product && (product.isSale || product.is_sale)) return 'sale';
      return 'regular';
    },
formatPreviewList(values) {
      return Array.isArray(values) && values.length ? values.join(', ') : '-';
    },
previewColorGroups(product) {
      const variants = this.previewVariants(product);
      const images = this.previewImages(product);
      const declaredColors = Array.isArray(product && product.colors) ? product.colors : [];
      const colorVariants = Array.isArray(product && (product.colorVariants || product.color_variants))
        ? product.colorVariants || product.color_variants
        : [];
      const groups = new Map();

      const mergeColorMetadata = (group, source = {}) => {
        const nextProductCode = String(
          source.productCode ||
          source.product_code ||
          source.articleNumber ||
          source.article_number ||
          ''
        ).trim();
        const nextHex = String(source.hex || source.colorHex || source.color_hex || '').trim();
        const nextFamily = String(source.family || source.colorFamily || source.color_family || '').trim();
        const nextOriginalPrice = source.originalPrice ?? source.original_price;
        const nextSalePrice = source.salePrice ?? source.sale_price;

        if (!group.productCode && nextProductCode) group.productCode = nextProductCode;
        if (!group.hex && nextHex) group.hex = nextHex;
        if (!group.family && nextFamily) group.family = nextFamily;
        if (group.originalPrice === null && nextOriginalPrice !== null && nextOriginalPrice !== undefined && nextOriginalPrice !== '') {
          group.originalPrice = Number(nextOriginalPrice);
        }
        if (group.salePrice === null && nextSalePrice !== null && nextSalePrice !== undefined && nextSalePrice !== '') {
          group.salePrice = Number(nextSalePrice);
        }
      };

      const ensureGroup = (colorName, productCode = '', source = {}) => {
        const name = String(colorName || 'Default').trim() || 'Default';
        const key = name.toLowerCase();

        if (!groups.has(key)) {
          groups.set(key, {
            key,
            name,
            productCode: '',
            hex: '',
            family: '',
            originalPrice: null,
            salePrice: null,
            images: [],
            sizes: [],
            totalStock: 0,
            reservedStock: 0,
            availableStock: 0,
            soldUnits: 0
          });
        }

        const group = groups.get(key);
        mergeColorMetadata(group, {
          ...source,
          productCode
        });

        return group;
      };

      declaredColors.forEach(color => {
        ensureGroup(
          color && (color.name || color.colorName),
          color && (color.productCode || color.product_code || color.articleNumber || color.article_number),
          color
        );
      });

      colorVariants.forEach(color => {
        ensureGroup(
          color && (color.name || color.colorName || color.color_name),
          color && (color.productCode || color.product_code || color.articleNumber || color.article_number),
          color
        );
      });

      variants.forEach(variant => {
        const group = ensureGroup(
          variant.colorName || variant.color_name,
          variant.productCode || variant.product_code || variant.articleNumber || variant.article_number,
          variant
        );

        group.sizes.push({
          sizeLabel: variant.sizeLabel || variant.size_label || 'One Size',
          stockQuantity: Number(variant.stockQuantity ?? variant.stock_quantity ?? 0),
          reservedQuantity: Number(variant.reservedQuantity ?? variant.reserved_quantity ?? 0),
          availableQuantity: Number(
            variant.availableQuantity ??
            variant.available_quantity ??
            Math.max(0, Number(variant.stockQuantity ?? variant.stock_quantity ?? 0) - Number(variant.reservedQuantity ?? variant.reserved_quantity ?? 0))
          ),
          soldQuantity: Number(variant.soldQuantity ?? variant.sold_quantity ?? 0)
        });
        group.totalStock += Number(variant.stockQuantity ?? variant.stock_quantity ?? 0);
        group.reservedStock += Number(variant.reservedQuantity ?? variant.reserved_quantity ?? 0);
        group.availableStock += Number(
          variant.availableQuantity ??
          variant.available_quantity ??
          Math.max(0, Number(variant.stockQuantity ?? variant.stock_quantity ?? 0) - Number(variant.reservedQuantity ?? variant.reserved_quantity ?? 0))
        );
        group.soldUnits += Number(variant.soldQuantity ?? variant.sold_quantity ?? 0);
      });

      const fallbackColorName =
        variants[0]?.colorName ||
        variants[0]?.color_name ||
        declaredColors[0]?.name ||
        'Default';

      images.forEach(image => {
        const group = ensureGroup(image.colorName || image.color_name || fallbackColorName);
        group.images.push(image);
      });

      return [...groups.values()].map(group => ({
        ...group,
        originalPrice: group.originalPrice ?? product.originalPrice ?? product.original_price ?? product.price,
        sizes: sortSizeItems(group.sizes)
      }));
    },
previewInventorySummary(product) {
      const variants = this.previewVariants(product);

      return variants.reduce((summary, variant) => {
        const stockQuantity = Number(variant.stockQuantity ?? variant.stock_quantity ?? 0);
        const reservedQuantity = Number(variant.reservedQuantity ?? variant.reserved_quantity ?? 0);
        const availableQuantity = Number(
          variant.availableQuantity ??
          variant.available_quantity ??
          Math.max(0, stockQuantity - reservedQuantity)
        );
        const soldQuantity = Number(variant.soldQuantity ?? variant.sold_quantity ?? 0);

        summary.totalVariants += 1;
        summary.totalStock += stockQuantity;
        summary.reservedStock += reservedQuantity;
        summary.availableStock += availableQuantity;
        summary.soldUnits += soldQuantity;
        return summary;
      }, {
        totalVariants: 0,
        totalStock: 0,
        reservedStock: 0,
        availableStock: 0,
        soldUnits: 0
      });
    },
primaryPreviewImage(product) {
      const images = this.previewImages(product);
      const primaryImage = images.find(image => image.isPrimary) || images[0];
      return primaryImage ? primaryImage.imageUrl : product && product.imageUrl || '';
    },
async openAdminProductPreview(product) {
      if (!product || !product.id) {
        return;
      }

      this.isLoadingAdminProductPreview = true;
      this.selectedAdminProductPreview = null;
      const response = await adminApi.getAdminProduct(product.id);
      this.isLoadingAdminProductPreview = false;

      if (!response) {
        flash('Unable to load product details.', 'error');
        return;
      }

      this.selectedAdminProductPreview = response;
    },
closeAdminProductPreview() {
      if (this.isLoadingAdminProductPreview) {
        return;
      }

      this.selectedAdminProductPreview = null;
    }
};
