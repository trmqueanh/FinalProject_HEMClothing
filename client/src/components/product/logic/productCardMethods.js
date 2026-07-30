// Logic sự kiện của ProductCard.vue; template và scoped CSS vẫn nằm trong component.
import { authStore, requestAuthModal } from '../../../stores/authStore';
import { favoritesStore } from '../../../stores/wishlistStore';
import { formatCurrency } from '../../../utils/formatCurrency';

export const productCardMethods = {
    formatCurrency,
    requireUserAccount(options = {}) {
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
        message: options.message || 'Sign in or create an account to save this item. We will add it to your wishlist automatically once you are signed in.',
        pendingAction: options.pendingAction || {
          type: 'wishlist',
          productId: this.product.id,
          colorVariantId: this.favoriteColorVariantId || ''
        }
      });
      return false;
    },
    async toggleFavorite() {
      if (this.isTogglingFavorite) {
        return;
      }

      if (!this.requireUserAccount({
        message: 'Sign in or create an account to save this item. We will add it to your wishlist automatically once you are signed in.',
        pendingAction: {
          type: 'wishlist',
          productId: this.product.id,
          colorVariantId: this.favoriteColorVariantId || '',
          product: {
            ...this.product,
            color: this.favoriteColorName,
            colorName: this.favoriteColorName
          }
        }
      })) {
        return;
      }

      this.isTogglingFavorite = true;
      try {
        this.isFavorite = await favoritesStore.toggleItem(this.product, this.favoriteColorVariantId || '', {
          product: {
            ...this.product,
            color: this.favoriteColorName,
            colorName: this.favoriteColorName
          }
        });
      } finally {
        this.isTogglingFavorite = false;
      }
    }
  };
