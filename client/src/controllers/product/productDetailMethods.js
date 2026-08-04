import { authStore, requestAuthModal } from '../../stores/authStore';
import { catalogStore } from '../../stores/catalogStore';
import { cartStore } from '../../stores/cartStore';
import { favoritesStore } from '../../stores/wishlistStore';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  findInventoryItem as findInventoryItemValue,
  formatProductDate,
  formatRouteLabel,
  getFirstAvailableVariant as getFirstAvailableVariantValue,
  getProductCategoryId,
  getRatingDescription,
  getVariantAvailableQuantity as getVariantAvailableQuantityValue,
  isColorSoldOut as isColorSoldOutValue,
  reviewVariantLabel as buildReviewVariantLabel,
  reviewVariantMeta
} from '../../helpers/product/productDetailHelpers';
import { productDetailApi } from '../../services/productDetailApi';

export const productDetailMethods = {
    formatCurrency,
    formatRouteLabel,
    formatDate: formatProductDate,
    reviewVariantLabel(review) {
      return buildReviewVariantLabel(review, this.product && this.product.name);
    },
    reviewVariantMeta,
    productCategoryId() {
      return getProductCategoryId(this.product);
    },
    closeSizeGuide() {
      this.sizeGuideRequestId += 1;
      this.showSizeGuide = false;
      this.isLoadingSizeGuide = false;
    },
    async prefetchSizeGuide() {
      if (!this.canShowSizeGuide) return;
      const categoryId = this.productCategoryId();
      if (!categoryId) return;

      const guide = await productDetailApi.getCategorySizeGuide(categoryId);
      if (categoryId !== this.productCategoryId()) return;

      this.sizeGuide = guide;
      this.sizeGuideCategoryId = categoryId;
    },
    async openSizeGuide() {
      if (!this.canShowSizeGuide) return;
      const categoryId = this.productCategoryId();
      const requestId = this.sizeGuideRequestId + 1;

      this.sizeGuideRequestId = requestId;
      this.showSizeGuide = true;

      if (!categoryId) {
        this.sizeGuide = null;
        this.sizeGuideCategoryId = '';
        this.isLoadingSizeGuide = false;
        return;
      }

      if (this.sizeGuideCategoryId === categoryId) {
        this.isLoadingSizeGuide = false;
        return;
      }

      this.sizeGuide = null;
      this.isLoadingSizeGuide = true;
      const guide = await productDetailApi.getCategorySizeGuide(categoryId);

      if (requestId !== this.sizeGuideRequestId) return;

      this.sizeGuide = guide;
      this.sizeGuideCategoryId = categoryId;
      this.isLoadingSizeGuide = false;
    },
    syncFavoriteState() {
      this.isFavorite = this.product && authStore.isUser()
        ? favoritesStore.isFavorite(this.product.id, this.selectedColorVariantId || '')
        : false;
    },
    findInventoryItem(colorName, sizeLabel, colorVariantId = '') {
      return findInventoryItemValue(this.inventoryItems, colorName, sizeLabel, colorVariantId);
    },
    getVariantAvailableQuantity(variant) {
      return getVariantAvailableQuantityValue(variant);
    },
    isColorSoldOut(colorName, colorVariantId = '') {
      return isColorSoldOutValue(this.inventoryItems, colorName, colorVariantId);
    },
    getFirstAvailableVariant(preferredColor = '', preferredColorVariantId = '') {
      return getFirstAvailableVariantValue(this.inventoryItems, preferredColor, preferredColorVariantId);
    },
    setDefaultVariant() {
      const requestedVariantId = String(
        this.$route.query.variant ||
        this.$route.query.colorVariantId ||
        this.$route.query.color_variant_id ||
        ''
      ).trim();
      const requestedColorName = String(
        this.$route.query.colorName ||
        this.$route.query.color_name ||
        this.$route.query.selectedColor ||
        ''
      ).trim().toLowerCase();
      const requestedColor = Array.isArray(this.productColorOptions)
        ? this.productColorOptions.find(color =>
            requestedVariantId &&
            String(color.colorVariantId || color.color_variant_id || '').trim() === requestedVariantId
          ) ||
          this.productColorOptions.find(color =>
            requestedColorName &&
            String(color.colorName || color.name || '').trim().toLowerCase() === requestedColorName
          )
        : null;
      const firstColor = requestedColor ||
        (Array.isArray(this.productColorOptions) && this.productColorOptions.length
        ? this.productColorOptions[0]
        : null);

      this.selectedColor = firstColor
        ? String(firstColor.colorName || firstColor.name || '').trim()
        : '';
      this.selectedColorVariantId = firstColor
        ? String(firstColor.colorVariantId || firstColor.color_variant_id || '').trim()
        : '';
      const defaultVariant = this.getFirstAvailableVariant(this.selectedColor, this.selectedColorVariantId);
      this.selectedSize = this.requiresSizeSelection
        ? ''
        : String(defaultVariant && (defaultVariant.sizeLabel || defaultVariant.size_label) || 'One Size');
      this.quantity = 1;
      this.activeImageIndex = 0;
    },
    isSizeAvailable(size) {
      if (!this.inventoryItems.length) {
        return false;
      }

      if (!this.selectedColorVariantId && !this.selectedColor) {
        return false;
      }

      const match = this.findInventoryItem(this.selectedColor, size, this.selectedColorVariantId);
      return Boolean(match && this.getVariantAvailableQuantity(match) > 0);
    },
    handleColorSelection(colorOption) {
      const option = typeof colorOption === 'object' && colorOption !== null
        ? colorOption
        : this.productColorOptions.find(color =>
            String(color.colorVariantId || '') === String(colorOption || '') ||
            String(color.name || color.colorName || '').trim().toLowerCase() === String(colorOption || '').trim().toLowerCase()
          ) || { name: String(colorOption || '') };
      const colorName = String(option.colorName || option.name || '').trim();
      const colorVariantId = String(option.colorVariantId || option.color_variant_id || '').trim();

      this.selectedColor = colorName;
      this.selectedColorVariantId = colorVariantId;
      this.syncFavoriteState();
      this.activeImageIndex = 0;
      const defaultVariant = this.getFirstAvailableVariant(colorName, colorVariantId);
      this.selectedSize = this.requiresSizeSelection
        ? ''
        : String(defaultVariant && (defaultVariant.sizeLabel || defaultVariant.size_label) || 'One Size');
      this.quantity = 1;

      if (!this.inventoryItems.length) {
        return;
      }

      this.quantity = Math.min(this.quantity, this.maxQuantity);
    },
    handleSizeSelection(size) {
      if (!this.isSizeAvailable(size)) {
        return;
      }

      this.selectedSize = size;
      this.quantity = Math.min(this.quantity, this.maxQuantity);
    },
    requireUserAccount({ message, pendingAction }) {
      if (authStore.isUser()) {
        return true;
      }

      if (authStore.isAdmin()) {
        this.flash('Admin accounts use the dashboard and cannot shop from the storefront.', 'error');
        this.$router.push('/studio');
        return false;
      }

      requestAuthModal({
        mode: 'email',
        message,
        pendingAction
      });
      return false;
    },
    async loadProduct() {
      const [product, products] = await Promise.all([
        catalogStore.getProduct(this.$route.params.id),
        catalogStore.getProducts()
      ]);

      this.product = product;
      this.syncProductDepartmentRoute();
      this.products = products;
      this.sizeGuide = null;
      this.sizeGuideCategoryId = '';
      this.showSizeGuide = false;
      this.setDefaultVariant();
      this.syncFavoriteState();
      this.prefetchSizeGuide();
      await this.loadReviewContext();

      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
      }
    },
    syncProductDepartmentRoute() {
      if (!this.product || !this.$router || !this.$route) {
        return;
      }

      const department = String(this.product.gender || '').trim().toLowerCase() === 'men' ? 'men' : 'women';
      const productId = String(this.$route.params.id || this.product.slug || this.product.id || '').trim();

      if (!productId) {
        return;
      }

      const targetPath = `/${department}/product/${encodeURIComponent(productId)}`;

      if (this.$route.path === targetPath) {
        return;
      }

      this.$router.replace({
        path: targetPath,
        query: { ...this.$route.query },
        hash: this.$route.hash
      }).catch(() => null);
    },
    async loadReviewContext() {
      if (!this.product) {
        return;
      }

      this.isLoadingReviews = true;
      this.hasLoadedReviews = false;
      const [reviewPayload, myReviewsPayload, myOrders] = await Promise.all([
        productDetailApi.getProductReviews(this.product.id),
        this.isUser ? productDetailApi.getMyReviews() : Promise.resolve({ items: [] }),
        this.isUser ? productDetailApi.getMyOrders() : Promise.resolve([])
      ]);

      this.reviewPayload = {
        averageRating: Number(reviewPayload && reviewPayload.averageRating) || 0,
        reviewCount: Number(reviewPayload && reviewPayload.reviewCount) || 0,
        items: Array.isArray(reviewPayload && reviewPayload.items) ? reviewPayload.items : []
      };
      this.myReviews = Array.isArray(myReviewsPayload && myReviewsPayload.items) ? myReviewsPayload.items : [];
      this.myOrders = Array.isArray(myOrders) ? myOrders : [];
      this.visibleReviewCount = 3;
      this.editingReviewId = '';
      this.reviewForm = {
        rating: this.myProductReview ? Number(this.myProductReview.rating || 5) : 5,
        comment: this.myProductReview ? String(this.myProductReview.comment || this.myProductReview.body || '') : ''
      };
      this.hasLoadedReviews = true;
      this.isLoadingReviews = false;
    },
    startEditReview() {
      if (!this.myProductReview) {
        return;
      }

      this.editingReviewId = this.myProductReview.id;
      this.reviewForm = {
        rating: Number(this.myProductReview.rating || 5),
        comment: String(this.myProductReview.comment || this.myProductReview.body || '')
      };
    },
    cancelEditReview() {
      this.editingReviewId = '';
      this.reviewForm = {
        rating: this.myProductReview ? Number(this.myProductReview.rating || 5) : 5,
        comment: this.myProductReview ? String(this.myProductReview.comment || this.myProductReview.body || '') : ''
      };
    },
    toggleReviewVisibility() {
      this.visibleReviewCount = this.allReviewsVisible
        ? 3
        : Math.min(this.visibleReviewCount + 3, this.sortedProductReviews.length);
    },
    async submitReview() {
      if (!this.product || this.isSavingReview) {
        return;
      }

      this.isSavingReview = true;
      const payload = {
        rating: Number(this.reviewForm.rating || 0),
        comment: String(this.reviewForm.comment || '').trim()
      };

      if (!this.editingReviewId && this.eligibleReviewOrder) {
        payload.orderId = this.eligibleReviewOrder.id;
      }

      const response = this.editingReviewId
        ? await productDetailApi.updateReview(this.editingReviewId, payload)
        : await productDetailApi.createProductReview(this.product.id, payload);
      this.isSavingReview = false;

      if (!response) {
        return;
      }

      const wasEditing = Boolean(this.editingReviewId);
      await this.loadReviewContext();
      this.flash(wasEditing ? 'Review updated.' : 'Review submitted.', 'success');
    },
    changeQuantity(step) {
      if (this.isQuantityDisabled) {
        return;
      }

      const nextValue = this.quantity + Number(step || 0);
      this.quantity = Math.min(this.maxQuantity, Math.max(1, nextValue));
    },
    async addToCart() {
      if (!this.product) {
        return;
      }

      if (!this.hasValidSelection) {
        this.flash(
          this.requiresSizeSelection
            ? 'Please choose an available color and size.'
            : 'Please choose an available color.',
          'error'
        );
        return;
      }

      if (!this.isInStock) {
        this.flash('This product is currently out of stock.', 'error');
        return;
      }

      if (
        !this.requireUserAccount({
          message: 'Add this item to your bag. Sign in or create an account to continue.',
          pendingAction: {
            type: 'cart',
            product: this.product,
            quantity: this.quantity,
            size: this.selectedSize,
            color: this.selectedColor,
            colorVariantId: this.selectedColorVariantId
          }
        })
      ) {
        return;
      }

      if (this.isAdding) {
        return;
      }

      this.isAdding = true;
      try {
        await cartStore.addItem({
          product: this.product,
          quantity: this.quantity,
          size: this.selectedSize,
          color: this.selectedColor,
          colorVariantId: this.selectedColorVariantId
        });
      } finally {
        this.isAdding = false;
      }
    },
    async toggleFavorite() {
      if (!this.product) {
        return;
      }

      if (this.isTogglingFavorite) {
        return;
      }

      if (
        !this.requireUserAccount({
          message: 'Save this item for later. Sign in or create an account to continue.',
          pendingAction: {
            type: 'wishlist',
            productId: this.product.id,
            colorVariantId: this.selectedColorVariantId || '',
            product: {
              ...this.product,
              color: this.selectedColor,
              colorName: this.selectedColor
            }
          }
        })
      ) {
        return;
      }

      this.isTogglingFavorite = true;
      try {
        this.isFavorite = await favoritesStore.toggleItem(this.product.id, this.selectedColorVariantId || '', {
          product: {
            ...this.product,
            color: this.selectedColor,
            colorName: this.selectedColor
          }
        });
      } finally {
        this.isTogglingFavorite = false;
      }
    },
    scrollToReviews() {
      const el = this.$el.querySelector('.product-reviews');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    },
    getRatingDescription
  };
