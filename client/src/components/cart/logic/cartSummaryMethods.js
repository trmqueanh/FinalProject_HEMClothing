// Logic sự kiện của CartSummary.vue; template và scoped CSS vẫn nằm trong component.
import { formatCurrency } from '../../../utils/formatCurrency';
import { shouldDisplaySize } from '../../../helpers/sizes';
import {
  cartProductLink,
  hasComparePrice,
  itemComparePrice,
  itemPrice,
  itemPriceTone,
  priceLabel
} from '../../../helpers/cart/cartItemHelpers';

export const cartSummaryMethods = {
    formatCurrency,
    itemPrice,
    itemComparePrice,
    hasComparePrice,
    itemPriceTone,
    priceLabel,
    shouldDisplaySize,
    productLink(item) {
      if (!this.linkItems) {
        return null;
      }

      const productId = item && (item.productSlug || item.slug || item.productId || item.product_id || item.id);

      if (!productId) {
        return null;
      }

      return cartProductLink(item);
    },
    goToCheckout() {
      if (!this.$router || this.checkoutDisabled) {
        return;
      }

      this.$router.push(this.checkoutTo || '/checkout');
    }
  };
