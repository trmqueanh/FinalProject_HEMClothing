<template>
  <div class="page-section product-detail-page animate-editorial-fade-up">
    <!-- Size Guide Modal -->
    <transition name="modal-fade">
      <SizeGuideModal
        v-if="showSizeGuide && canShowSizeGuide"
        :guide="sizeGuide"
        :is-loading="isLoadingSizeGuide"
        @close="closeSizeGuide"
      />
    </transition>

    <section v-if="product" class="product-detail">
      <!-- Left: Visual Custom Gallery -->
      <ProductGallery
        :breadcrumb-items="breadcrumbItems"
        :product-gallery-images="productGalleryImages"
        :active-image-index="activeImageIndex"
        @select-image="activeImageIndex = $event"
      />

      <!-- Right: Info Panel -->
      <div class="product-detail__panel">

        <!-- Product Info: top section, clean & minimal -->
        <ProductInfoPanel
          :product="product"
          :pricing-mode="pricingMode"
          :is-favorite="isFavorite"
          :is-toggling-favorite="isTogglingFavorite"
          :active-price-label="activePriceLabel"
          :effective-display-price="effectiveDisplayPrice"
          :has-compare-price="hasComparePrice"
          :compare-display-price="compareDisplayPrice"
          :product-badges="productBadges"
          :format-currency="formatCurrency"
          @toggle-favorite="toggleFavorite"
        />

        <!-- Variant Selection -->
        <VariantSelector
          :selected-color="selectedColor"
          :selected-color-variant-id="selectedColorVariantId"
          :product-color-options="productColorOptions"
          :selected-size="selectedSize"
          :available-sizes-for-selected-color="availableSizesForSelectedColor"
          :is-size-available="isSizeAvailable"
          :stock-label="stockLabel"
          :stock-state-class="stockStateClass"
          :stock-helper-text="stockHelperText"
          :quantity="quantity"
          :is-quantity-disabled="isQuantityDisabled"
          :max-quantity="maxQuantity"
          :quantity-limit-text="quantityLimitText"
          :can-add-to-cart="canAddToCart"
          :is-adding="isAdding"
          :add-to-cart-label="addToCartLabel"
          :display-average-rating="displayAverageRating"
          :display-review-count="displayReviewCount"
          :show-size-guide="canShowSizeGuide"
          :show-size-selector="requiresSizeSelection"
          @select-color="handleColorSelection"
          @open-size-guide="openSizeGuide"
          @select-size="handleSizeSelection"
          @change-quantity="changeQuantity"
          @add-to-cart="addToCart"
          @scroll-to-reviews="scrollToReviews"
        />

        <!-- Accordions -->
        <ProductAccordions
          :product="product"
          :product-code="productCode"
          :selected-color="selectedColorName"
          :available-colors="allProductColorNames"
          :available-sizes="allProductSizeLabels"
          :product-group-slug="productGroupSlug"
          :tag-label="productTagLabel"
        />
      </div>
    </section>

    <!-- Reviews Section -->
    <ProductReviews
      v-if="product"
      :display-average-rating="displayAverageRating"
      :review-count="displayReviewCount"
      :review-count-label="reviewCountLabel"
      :star-distribution="starDistribution"
      :is-loading-reviews="isLoadingReviews"
      :my-product-review="myProductReview"
      :editing-review-id="editingReviewId"
      :should-show-review-form="shouldShowReviewForm"
      :review-form="reviewForm"
      :is-saving-review="isSavingReview"
      :is-user="isUser"
      :has-purchased-product="hasPurchasedProduct"
      :visible-product-reviews="visibleProductReviews"
      :show-review-toggle="showReviewToggle"
      :all-reviews-visible="allReviewsVisible"
      :format-date="formatDate"
      :review-variant-meta="reviewVariantMeta"
      :get-rating-description="getRatingDescription"
      @submit-review="submitReview"
      @update-review-rating="reviewForm.rating = $event"
      @update-review-comment="reviewForm.comment = $event"
      @cancel-edit-review="cancelEditReview"
      @toggle-review-visibility="toggleReviewVisibility"
    />

    <!-- Product recommendations -->
    <div v-if="similarItems.length || othersAlsoBought.length" class="product-detail__recommendations shop-view">
      <ShopLandingProductSection
        v-if="similarItems.length"
        section-id="product-similar-items"
        label="Similar Items"
        :products="similarItems"
      />
      <ShopLandingProductSection
        v-if="othersAlsoBought.length"
        section-id="product-others-bought"
        label="Others also bought"
        :products="othersAlsoBought"
      />
    </div>
  </div>
</template>

<script>
import { productDetailMethods } from "../../controllers/product/productDetailMethods";
import ProductAccordions from '../../components/product/ProductAccordions.vue';
import ProductGallery from '../../components/product/ProductGallery.vue';
import ProductInfoPanel from '../../components/product/ProductInfoPanel.vue';
import ProductReviews from '../../components/product/ProductReviews.vue';
import SizeGuideModal from '../../components/product/SizeGuideModal.vue';
import ShopLandingProductSection from '../../components/shop/ShopLandingProductSection.vue';
import VariantSelector from '../../components/product/VariantSelector.vue';
import { authStore } from '../../stores/authStore';
import { normalizeDepartment } from '../../stores/catalogStore';
import { normalizeColorOption } from '../../helpers/colors';
import { favoritesStore } from '../../stores/wishlistStore';
import { expandProductsToColorCards, mixListingColorCards } from '../../helpers/shop/listingColorCards';
import { LISTING_FILTER_KEYS, SPECIAL_CONTEXT_LABELS } from '../../helpers/product/productDetailContext';
import {
  buildProductGalleryImages,
  buildStarDistribution
} from '../../helpers/product/productDetailHelpers';
import { sortSizeLabels } from '../../helpers/sizes';
import { LOW_STOCK_THRESHOLD } from '../../utils/constants';

export default {
  name: 'ProductDetailView',
  components: {
    ProductAccordions,
    ProductGallery,
    ProductInfoPanel,
    ProductReviews,
    SizeGuideModal,
    ShopLandingProductSection,
    VariantSelector
  },
  data() {
    return {
      product: null,
      products: [],
      selectedSize: '',
      selectedColor: '',
      selectedColorVariantId: '',
      quantity: 1,
      isFavorite: false,
      isTogglingFavorite: false,
      isAdding: false,
      isLoadingReviews: false,
      hasLoadedReviews: false,
      isSavingReview: false,
      editingReviewId: '',
      reviewPayload: {
        averageRating: 0,
        reviewCount: 0,
        items: []
      },
      visibleReviewCount: 3,
      myReviews: [],
      myOrders: [],
      reviewForm: {
        rating: 5,
        comment: ''
      },
      session: authStore.getSession(),
      showSizeGuide: false,
      sizeGuide: null,
      sizeGuideCategoryId: '',
      isLoadingSizeGuide: false,
      sizeGuideRequestId: 0,
      activeImageIndex: 0
    };
  },
  computed: {
    productGroupSlug() {
      return String(
        this.product && (this.product.productGroupSlug || this.product.product_group_slug || this.product.productGroup) || 'clothing'
      ).trim().toLowerCase();
    },
    canShowSizeGuide() {
      return this.productGroupSlug !== 'accessories' && this.availableSizesForSelectedColor.length > 0;
    },
    requiresSizeSelection() {
      return this.productGroupSlug !== 'accessories';
    },
    productGalleryImages() {
      return buildProductGalleryImages(this.product, this.selectedColorVariantId, this.selectedColor);
    },
    starDistribution() {
      return buildStarDistribution(this.productReviews);
    },
    departmentLabel() {
      return this.departmentKey === 'men' ? 'Men' : 'Women';
    },
    departmentKey() {
      if (this.$route.meta.department === 'men' || this.$route.path.startsWith('/men')) {
        return 'men';
      }

      if (this.$route.meta.department === 'women' || this.$route.path.startsWith('/women')) {
        return 'women';
      }

      return normalizeDepartment(this.product && this.product.gender);
    },
    departmentLink() {
      return {
        path: this.departmentKey === 'men' ? '/men' : '/women'
      };
    },
    allProductsLink() {
      return {
        path: `${this.departmentKey === 'men' ? '/men' : '/women'}/all-products`
      };
    },
    currentCategoryLabel() {
      const category = this.product && this.product.category;

      return String(
        (this.product && this.product.categoryLabel) ||
        (category && typeof category === 'object' ? category.label || category.name : category) ||
        ''
      ).trim();
    },
    currentCategorySlug() {
      const category = this.product && this.product.category;

      return String(
        (this.product && this.product.categorySlug) ||
        (category && typeof category === 'object' ? category.slug || category.name : category) ||
        this.currentCategoryLabel ||
        ''
      ).trim();
    },
    listingFilterQuery() {
      return LISTING_FILTER_KEYS.reduce((query, key) => {
        if (this.$route.query[key] !== undefined) {
          query[key] = this.$route.query[key];
        }

        return query;
      }, {});
    },
    productOriginContext() {
      const fromCategory = String(this.$route.query.fromCategory || '').trim();
      const fromCollection = String(this.$route.query.fromCollection || '').trim();
      const from = String(this.$route.query.from || '').trim();

      if (fromCategory) {
        return {
          type: 'category',
          key: fromCategory,
          label:
            normalizeDepartment(this.product && this.product.gender) === this.departmentKey &&
            fromCategory.toLowerCase() === this.currentCategorySlug.toLowerCase()
              ? this.currentCategoryLabel
              : this.formatRouteLabel(fromCategory)
        };
      }

      if (fromCollection) {
        const productCollectionSlug = String(this.product && this.product.collectionSlug || '').trim();
        const productCollectionLabel = String(this.product && this.product.collection || '').trim();

        return {
          type: 'collection',
          key: fromCollection,
          label:
            fromCollection.toLowerCase() === productCollectionSlug.toLowerCase() && productCollectionLabel
              ? productCollectionLabel
              : this.formatRouteLabel(fromCollection)
        };
      }

      if (SPECIAL_CONTEXT_LABELS[from]) {
        return {
          type: from === 'all-products' ? 'all-products' : 'special',
          key: from,
          label: SPECIAL_CONTEXT_LABELS[from]
        };
      }

      return null;
    },
    backToResultsLink() {
      if (!this.productOriginContext) {
        return this.allProductsLink;
      }

      const basePath = this.departmentKey === 'men' ? '/men' : '/women';
      const query = { ...this.listingFilterQuery };
      let path = `${basePath}/all-products`;

      if (this.productOriginContext.type === 'category') {
        path = `${basePath}/${encodeURIComponent(this.productOriginContext.key)}`;
        delete query.category;
      } else if (this.productOriginContext.type === 'collection') {
        path = `${basePath}/collections/${encodeURIComponent(this.productOriginContext.key)}`;
      } else if (this.productOriginContext.type === 'special') {
        path = `${basePath}/${this.productOriginContext.key}`;
      }

      return { path, query };
    },
    breadcrumbItems() {
      const items = [
        {
          label: 'HEM.COM',
          route: this.departmentLink
        },
        {
          label: this.departmentLabel,
          route: this.departmentLink
        }
      ];

      if (this.productOriginContext) {
        items.push({
          label: this.listingFilterQuery.q ? 'Search' : this.productOriginContext.label,
          route: this.backToResultsLink
        });
      }

      if (this.product && this.product.name) {
        items.push({
          label: this.product.name,
          current: true
        });
      }

      return items;
    },
    inventoryItems() {
      return Array.isArray(this.product && this.product.inventoryItems) ? this.product.inventoryItems : [];
    },
    productColorOptions() {
      const colorMap = new Map();
      const productImages = Array.isArray(this.product && this.product.productImages)
        ? this.product.productImages
        : [];
      const normalizeImage = image => ({
        id: String(image && image.id || ''),
        src: String(image && (image.imageUrl || image.image_url || image.url) || '').trim(),
        alt: String(image && (image.altText || image.alt_text) || this.product?.name || 'HEM product').trim(),
        colorVariantId: String(image && (image.colorVariantId || image.color_variant_id) || '').trim(),
        colorName: String(image && (image.colorName || image.color_name) || '').trim(),
        isPrimary: Boolean(image && (image.isPrimary || image.is_primary)),
        sortOrder: Number(image && (image.sortOrder || image.sort_order) || 0)
      });
      const imagesByVariantId = new Map();
      const imagesByColorName = new Map();

      productImages.map(normalizeImage).filter(image => image.src).forEach(image => {
        if (image.colorVariantId) {
          const images = imagesByVariantId.get(image.colorVariantId) || [];
          images.push(image);
          imagesByVariantId.set(image.colorVariantId, images);
        }

        const colorKey = image.colorName.trim().toLowerCase();
        if (colorKey) {
          const images = imagesByColorName.get(colorKey) || [];
          images.push(image);
          imagesByColorName.set(colorKey, images);
        }
      });

      const sortImages = images => [...images].sort((left, right) => {
        if (left.isPrimary !== right.isPrimary) {
          return left.isPrimary ? -1 : 1;
        }

        return left.sortOrder - right.sortOrder;
      });
      const optionKey = color => {
        const id = String(color.colorVariantId || color.color_variant_id || color.id || '').trim();
        const name = String(color.name || color.colorName || color.color_name || '').trim().toLowerCase();
        return id ? `id:${id}` : `name:${name}`;
      };
      const ensureColor = color => {
        const normalizedColor = normalizeColorOption(color);
        if (!normalizedColor.name) return null;

        const key = optionKey(normalizedColor);
        if (!colorMap.has(key)) {
          const id = normalizedColor.colorVariantId;
          const colorNameKey = normalizedColor.name.toLowerCase();
          const images = sortImages([
            ...(id ? imagesByVariantId.get(id) || [] : []),
            ...(!id || !(imagesByVariantId.get(id) || []).length ? imagesByColorName.get(colorNameKey) || [] : [])
          ]);

          colorMap.set(key, {
            ...normalizedColor,
            colorName: normalizedColor.name,
            colorHex: normalizedColor.hex,
            colorFamily: normalizedColor.family,
            productCode: normalizedColor.productCode,
            thumbnailImage: images[0]?.src || '',
            images,
            availableSizes: []
          });
        }

        return colorMap.get(key);
      };

      this.inventoryItems
        .filter(item => item && item.colorName)
        .forEach(item => {
          const color = ensureColor({
            name: item.colorName,
            hex: item.colorHex,
            family: item.colorFamily || item.color_family,
            colorVariantId: item.colorVariantId,
            productCode: item.productCode,
            articleNumber: item.articleNumber,
            salePrice: item.salePrice ?? item.sale_price ?? null
          });

          if (color) {
            color.availableSizes.push({
              sizeLabel: item.sizeLabel,
              availableQuantity: this.getVariantAvailableQuantity(item)
            });
          }
        });

      if (Array.isArray(this.product && this.product.colors)) {
        this.product.colors.forEach(ensureColor);
      }

      return [...colorMap.values()];
    },
    selectedVariant() {
      if (!this.inventoryItems.length) {
        return null;
      }

      if (!this.requiresSizeSelection) {
        return this.getFirstAvailableVariant(this.selectedColor, this.selectedColorVariantId);
      }

      return this.findInventoryItem(this.selectedColor, this.selectedSize, this.selectedColorVariantId);
    },
    selectedColorVariant() {
      const selectedId = String(this.selectedColorVariantId || '').trim();
      const selectedColorKey = String(this.selectedColor || '').trim().toLowerCase();

      return this.productColorOptions.find(color =>
        selectedId && String(color.colorVariantId || '').trim() === selectedId
      ) ||
        this.productColorOptions.find(color =>
          String(color.name || color.colorName || '').trim().toLowerCase() === selectedColorKey
        ) ||
        null;
    },
    selectedColorName() {
      return String(
        this.selectedColorVariant && (this.selectedColorVariant.colorName || this.selectedColorVariant.name) ||
        this.selectedColor ||
        ''
      ).trim();
    },
    productCode() {
      return String(
        this.selectedColorVariant && (this.selectedColorVariant.productCode || this.selectedColorVariant.product_code) || ''
      ).trim();
    },
    allProductColorNames() {
      const colors = this.productColorOptions
        .map(color => String(color.colorName || color.name || '').trim())
        .filter(Boolean);

      return [...new Set(colors)];
    },
    allProductSizeLabels() {
      if (!this.requiresSizeSelection) {
        return [];
      }

      const inventorySizes = this.inventoryItems
        .map(item => String(item.sizeLabel || item.size_label || '').trim())
        .filter(Boolean);
      const productSizes = Array.isArray(this.product && this.product.sizes)
        ? this.product.sizes.map(size => String(size || '').trim()).filter(Boolean)
        : [];

      return sortSizeLabels([...new Set(inventorySizes.length ? inventorySizes : productSizes)]);
    },
    availableSizesForSelectedColor() {
      if (!this.requiresSizeSelection) {
        return [];
      }

      if (!this.inventoryItems.length) {
        return sortSizeLabels(this.product && this.product.sizes);
      }

      const source = this.selectedColorVariantId
        ? this.inventoryItems.filter(item => String(item.colorVariantId || item.color_variant_id || '').trim() === this.selectedColorVariantId)
        : this.selectedColor
          ? this.inventoryItems.filter(item => item.colorName === this.selectedColor)
          : this.inventoryItems;

      return sortSizeLabels([...new Set(source.map(item => item.sizeLabel).filter(Boolean))]);
    },
    availableStock() {
      if (this.selectedVariant) {
        return this.getVariantAvailableQuantity(this.selectedVariant);
      }

      return this.totalAvailableStock;
    },
    totalAvailableStock() {
      return this.inventoryItems.reduce(
        (total, item) => total + this.getVariantAvailableQuantity(item),
        0
      );
    },
    isSoldOut() {
      return Boolean(this.product && this.inventoryItems.length && this.totalAvailableStock <= 0);
    },
    hasUnavailableInventory() {
      return Boolean(this.product && !this.inventoryItems.length);
    },
    hasPurchasableVariant() {
      return Boolean(
        this.selectedVariant &&
          this.getVariantAvailableQuantity(this.selectedVariant) > 0
      );
    },
    stockLabel() {
      if (this.hasUnavailableInventory) {
        return 'Currently unavailable';
      }

      if (this.isSoldOut) {
        return 'Sold Out';
      }

      if ((!this.selectedColorVariantId && !this.selectedColor) || (this.requiresSizeSelection && !this.selectedSize)) {
        if ((this.selectedColorVariantId || this.selectedColor) && this.isColorSoldOut(this.selectedColor, this.selectedColorVariantId)) {
          return 'Sold Out';
        }

        return this.selectedColorVariantId || this.selectedColor ? 'Select a size' : 'Select a color and size';
      }

      if (!this.selectedVariant) {
        return 'Currently unavailable';
      }

      if (this.availableStock <= 0) {
        return 'Sold Out';
      }

      if (this.availableStock <= LOW_STOCK_THRESHOLD) {
        return `Only ${this.availableStock} left`;
      }

      return 'In stock';
    },
    stockStateClass() {
      return {
        'stock-state--out':
          this.hasUnavailableInventory ||
          this.isSoldOut ||
          ((this.selectedColorVariantId || this.selectedColor) && this.isColorSoldOut(this.selectedColor, this.selectedColorVariantId)) ||
          (this.selectedVariant && this.availableStock <= 0),
        'stock-state--low': this.availableStock > 0 && this.availableStock <= LOW_STOCK_THRESHOLD,
        'stock-state--in': this.hasPurchasableVariant && this.availableStock > LOW_STOCK_THRESHOLD
      };
    },
    stockHelperText() {
      if (this.hasUnavailableInventory) {
        return 'This product has no active variants right now.';
      }

      if (this.isSoldOut || (this.selectedVariant && this.availableStock <= 0)) {
        return 'This color and size cannot be added to your bag.';
      }

      if ((this.selectedColorVariantId || this.selectedColor) && this.isColorSoldOut(this.selectedColor, this.selectedColorVariantId)) {
        return 'This color is currently out of stock.';
      }

      if (this.availableStock > 0 && this.availableStock <= LOW_STOCK_THRESHOLD) {
        return 'Low stock for the selected color and size.';
      }

      if ((!this.selectedColorVariantId && !this.selectedColor) || (this.requiresSizeSelection && !this.selectedSize)) {
        return this.selectedColorVariantId || this.selectedColor
          ? 'Choose a size to check availability.'
          : 'Choose a color and size to check availability.';
      }

      return '';
    },
    isInStock() {
      return Boolean(this.product && this.hasPurchasableVariant);
    },
    hasValidSelection() {
      return this.hasPurchasableVariant;
    },
    canAddToCart() {
      return Boolean(this.product && this.hasValidSelection && this.isInStock);
    },
    addToCartLabel() {
      return 'Add to cart';
    },
    maxQuantity() {
      if (!this.product || !this.hasPurchasableVariant) {
        return 1;
      }

      return Math.max(1, this.availableStock);
    },
    isQuantityDisabled() {
      return !this.hasPurchasableVariant;
    },
    quantityLimitText() {
      if (this.isQuantityDisabled) {
        return '';
      }

      if (this.quantity >= this.maxQuantity) {
        return this.maxQuantity <= LOW_STOCK_THRESHOLD ? `Only ${this.maxQuantity} left` : 'Maximum quantity reached';
      }

      return '';
    },
    isUser() {
      return Boolean(this.session.token && this.session.user && this.session.user.role !== 'admin');
    },
    productReviews() {
      return Array.isArray(this.reviewPayload.items) ? this.reviewPayload.items : [];
    },
    pricingMode() {
      return this.selectedPricing.pricingMode;
    },
    hasSalePrice() {
      return this.pricingMode === 'sale' && this.originalDisplayPrice > this.effectiveDisplayPrice;
    },
    selectedPricing() {
      const product = this.product || {};
      const variant = this.selectedColorVariant || {};
      const readPrice = value => {
        if (value === null || value === undefined || value === '') {
          return null;
        }

        const nextValue = Number(value);
        return Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : null;
      };
      const comparePrice =
        readPrice(product.originalPrice ?? product.original_price) ??
        readPrice(product.price) ??
        0;
      const variantSalePrice = readPrice(variant.salePrice ?? variant.sale_price);
      const productSalePrice = readPrice(product.salePrice ?? product.sale_price);
      const candidates = [
        { effectivePrice: comparePrice, pricingMode: 'regular', priceSource: 'product', priority: 4 }
      ];

      if (variantSalePrice !== null) {
        candidates.push({ effectivePrice: variantSalePrice, pricingMode: 'sale', priceSource: 'variant', priority: 2 });
      }

      if (productSalePrice !== null) {
        candidates.push({ effectivePrice: productSalePrice, pricingMode: 'sale', priceSource: 'product', priority: 3 });
      }

      const selected = [...candidates].sort((left, right) =>
        (left.effectivePrice - right.effectivePrice) ||
        (left.priority - right.priority)
      )[0];

      return {
        effectivePrice: selected.effectivePrice,
        comparePrice,
        pricingMode: selected.pricingMode,
        priceSource: selected.priceSource,
        hasDiscount: comparePrice > selected.effectivePrice
      };
    },
    originalDisplayPrice() {
      return this.selectedPricing.comparePrice;
    },
    displayPrice() {
      return this.effectiveDisplayPrice;
    },
    effectiveDisplayPrice() {
      return this.selectedPricing.effectivePrice;
    },
    compareDisplayPrice() {
      if (this.hasSalePrice) {
        return this.originalDisplayPrice;
      }

      return 0;
    },
    hasComparePrice() {
      return this.compareDisplayPrice > this.effectiveDisplayPrice;
    },
    activePriceLabel() {
      if (this.hasSalePrice) {
        return 'Sale';
      }

      return '';
    },
    productTagLabel() {
      return String(
        (this.product && (this.product.collection || this.product.collectionSlug || this.currentCategoryLabel)) ||
          'HEM'
      )
        .replace(/[-_]+/g, ' ')
        .toUpperCase();
    },
    productBadges() {
      if (!this.product) {
        return [];
      }

      const badges = [];
      if (Boolean(this.product.isBestseller || this.product.is_bestseller) || Number(this.product.soldCount || 0) > 0) {
        badges.push({
          label: 'Best Seller',
          tone: 'best'
        });
      }

      if (this.product.newArrival) {
        badges.push({
          label: 'New Arrival',
          tone: 'new'
        });
      }

      if (
        this.hasUnavailableInventory ||
        this.isSoldOut ||
        ((this.selectedColorVariantId || this.selectedColor) && this.isColorSoldOut(this.selectedColor, this.selectedColorVariantId))
      ) {
        badges.push({
          label: 'Sold Out',
          tone: 'out'
        });
      } else if (this.availableStock > 0 && this.availableStock <= LOW_STOCK_THRESHOLD) {
        badges.push({
          label: `Only ${this.availableStock} left`,
          tone: 'low'
        });
      }

      return badges;
    },
    selectedVariantText() {
      if (this.hasUnavailableInventory || this.isSoldOut || (this.selectedVariant && this.availableStock <= 0)) {
        return '';
      }

      if (!this.selectedColorName && (!this.selectedSize || !this.requiresSizeSelection)) {
        if (!this.requiresSizeSelection) {
          return 'Selected: choose a color';
        }
        return 'Selected: choose a color and size';
      }

      const parts = [this.selectedColorName || 'Choose color'];
      if (this.requiresSizeSelection) {
        parts.push(this.selectedSize ? `Size ${this.selectedSize}` : 'Choose size');
      }

      return `Selected: ${parts.join(' / ')}`;
    },
    reviewCountLabel() {
      const count = this.displayReviewCount;
      return `${count} Review${count === 1 ? '' : 's'}`;
    },
    displayAverageRating() {
      if (this.displayReviewCount === 0) {
        return 0;
      }

      return this.hasLoadedReviews
        ? Number(this.reviewPayload.averageRating || 0)
        : Number((this.product && this.product.rating) || 0);
    },
    displayReviewCount() {
      return this.hasLoadedReviews
        ? Number(this.reviewPayload.reviewCount || 0)
        : Number((this.product && this.product.reviews) || 0);
    },
    visibleProductReviews() {
      return this.sortedProductReviews.slice(0, this.visibleReviewCount);
    },
    sortedProductReviews() {
      const reviews = this.myProductReview
        ? this.productReviews.filter(review => String(review.id) !== String(this.myProductReview.id))
        : this.productReviews;

      return [...reviews].sort((left, right) => {
        const leftDate = new Date(left.updatedAt || left.createdAt || 0).getTime();
        const rightDate = new Date(right.updatedAt || right.createdAt || 0).getTime();

        return rightDate - leftDate;
      });
    },
    allReviewsVisible() {
      return this.visibleReviewCount >= this.sortedProductReviews.length;
    },
    showReviewToggle() {
      return this.sortedProductReviews.length > 3;
    },
    myProductReview() {
      if (!this.product || !this.isUser) {
        return null;
      }

      const accountReview = this.myReviews.find(review => String(review.productId) === String(this.product.id)) || null;

      if (!accountReview) {
        return null;
      }

      const publicReview = this.productReviews.find(review => String(review.id) === String(accountReview.id)) || null;

      return publicReview
        ? {
            ...accountReview,
            adminReply: publicReview.adminReply || accountReview.adminReply || ''
          }
        : accountReview;
    },
    completedProductOrders() {
      if (!this.product || !this.isUser) {
        return [];
      }

      return this.myOrders.filter(order => {
        const status = String(order.orderStatus || '').toLowerCase();
        const items = Array.isArray(order.items) ? order.items : [];

        return status === 'completed' && items.some(item => String(item.productId) === String(this.product.id));
      });
    },
    eligibleReviewOrder() {
      return this.completedProductOrders.find(order =>
        !this.myReviews.some(review =>
          String(review.productId) === String(this.product.id) &&
          String(review.orderId) === String(order.id)
        )
      ) || null;
    },
    hasPurchasedProduct() {
      if (!this.product || !this.isUser) {
        return false;
      }

      return this.completedProductOrders.length > 0;
    },
    shouldShowReviewForm() {
      if (!this.isUser || !this.hasPurchasedProduct) {
        return false;
      }

      return Boolean(this.editingReviewId) || (!this.myProductReview && Boolean(this.eligibleReviewOrder));
    },
    recommendationPool() {
      if (!this.product) {
        return [];
      }

      return this.products
        .filter(item =>
          item.id !== this.product.id &&
          normalizeDepartment(item.gender) === normalizeDepartment(this.product.gender)
        );
    },
    similarItems() {
      if (!this.product) {
        return [];
      }

      const categoryKey = product => {
        const category = product && (product.categorySlug || product.category_slug || product.category || product.categoryLabel || product.category_label);
        const value = category && typeof category === 'object'
          ? category.slug || category.name || category.label
          : category;

        return String(value || '').trim().toLowerCase();
      };
      const currentCategory = categoryKey(this.product);

      if (!currentCategory) {
        return [];
      }

      return mixListingColorCards(expandProductsToColorCards(this.recommendationPool
        .filter(item => categoryKey(item) === currentCategory)
        .sort((left, right) => {
          const leftCollectionMatch = left.collection && left.collection === this.product.collection ? 1 : 0;
          const rightCollectionMatch = right.collection && right.collection === this.product.collection ? 1 : 0;

          return (
            rightCollectionMatch - leftCollectionMatch ||
            Number(right.soldCount || right.sold_count || 0) - Number(left.soldCount || left.sold_count || 0)
          );
        })))
        .slice(0, 12);
    },
    othersAlsoBought() {
      if (!this.product) {
        return [];
      }

      const similarIds = new Set(this.similarItems.map(item => String(item.id)));
      const currentProductId = String(this.product.id);
      const categoryKey = product => {
        const category = product && (product.categorySlug || product.category_slug || product.category || product.categoryLabel || product.category_label);
        const value = category && typeof category === 'object'
          ? category.slug || category.name || category.label
          : category;

        return String(value || product.productGroupSlug || product.product_group_slug || 'other').trim().toLowerCase();
      };
      const hashSeed = value => {
        const text = String(value || '');
        let hash = 2166136261;

        for (let index = 0; index < text.length; index += 1) {
          hash ^= text.charCodeAt(index);
          hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        }

        return hash >>> 0;
      };
      const seededScore = item => {
        const seed = `${currentProductId}:${item.id}:${new Date().toISOString().slice(0, 10)}`;

        return hashSeed(seed) / 4294967295;
      };
      const currentDepartment = this.departmentKey || normalizeDepartment(this.product.gender);
      const candidates = this.products
        .filter(item => {
          const id = String(item.id);

          return (
            id &&
            id !== currentProductId &&
            !similarIds.has(id) &&
            normalizeDepartment(item.gender) === currentDepartment
          );
        })
        .map(item => ({
          item,
          category: categoryKey(item),
          score: seededScore(item)
        }))
        .sort((left, right) => {
          const departmentMatch =
            Number(normalizeDepartment(right.item.gender) === this.departmentKey) -
            Number(normalizeDepartment(left.item.gender) === this.departmentKey);

          return (
            departmentMatch ||
            right.score - left.score ||
            Number(right.item.soldCount || right.item.sold_count || right.item.orderedQuantity || 0) -
            Number(left.item.soldCount || left.item.sold_count || left.item.orderedQuantity || 0)
          );
        });
      const groupedCandidates = candidates.reduce((groups, candidate) => {
        if (!groups.has(candidate.category)) groups.set(candidate.category, []);
        groups.get(candidate.category).push(candidate.item);
        return groups;
      }, new Map());
      const mixedItems = [];
      const groups = [...groupedCandidates.values()];

      while (mixedItems.length < 12 && groups.some(group => group.length)) {
        groups.forEach(group => {
          if (mixedItems.length < 12 && group.length) {
            mixedItems.push(group.shift());
          }
        });
      }

      return mixListingColorCards(expandProductsToColorCards(mixedItems)).slice(0, 12);
    }
  },
  watch: {
    '$route.params.id': {
      immediate: true,
      handler() {
        this.loadProduct();
      }
    },
    '$route.query.variant'() {
      if (this.product) {
        this.setDefaultVariant();
      }
    },
    '$route.query.colorName'() {
      if (this.product) {
        this.setDefaultVariant();
      }
    },
    productGalleryImages(nextImages) {
      if (!Array.isArray(nextImages) || this.activeImageIndex >= nextImages.length) {
        this.activeImageIndex = 0;
      }
    }
  },
  created() {
    this.handleFavoriteUpdate = () => {
      this.syncFavoriteState();
    };

    this.handleStateUpdate = async () => {
      this.session = authStore.getSession();

      if (authStore.isUser()) {
        await favoritesStore.sync();
      }

      this.syncFavoriteState();
      await this.loadReviewContext();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('favorites-updated', this.handleFavoriteUpdate);
      window.addEventListener('auth-updated', this.handleStateUpdate);
      window.addEventListener('storage', this.handleStateUpdate);
    }
  },
  beforeUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('favorites-updated', this.handleFavoriteUpdate);
      window.removeEventListener('auth-updated', this.handleStateUpdate);
      window.removeEventListener('storage', this.handleStateUpdate);
    }
  },
  methods: productDetailMethods
};
</script>

<style scoped src="@/assets/styles/product/ProductDetail.css"></style>
