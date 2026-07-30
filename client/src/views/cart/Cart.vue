<template>
  <div class="page-section">
    <PageBreadcrumbs :items="breadcrumbItems" />

    <h1 class="cart-heading">SHOPPING BAG</h1>

    <section v-if="isCartLoading" class="shell-card cart-loading" aria-live="polite">
      <span class="cart-loading__spinner" aria-hidden="true"></span>
      <div>
        <h2>Loading your bag...</h2>
        <p>Checking your latest cart items.</p>
      </div>
    </section>

    <section v-else-if="!cartItems.length" class="shell-card cart-empty">
      <h2>Your bag is empty.</h2>
      <p>Start in the shop to add tailored layers, dresses, or accessories.</p>
      <router-link to="/women" class="primary-button">Browse products</router-link>
    </section>

    <section v-else class="cart-layout">
      <div class="cart-lines">
        <div class="shell-card cart-selection-bar">
          <div class="cart-selection-bar__summary">
            <label class="cart-check cart-check--all">
              <input
                type="checkbox"
                :checked="allItemsSelected"
                :aria-checked="someItemsSelected && !allItemsSelected ? 'mixed' : String(allItemsSelected)"
                @change="toggleAllItems($event.target.checked)"
              />
              <span>Select all</span>
            </label>
          </div>

          <button
            v-if="someItemsSelected"
            type="button"
            class="cart-selection-bar__delete"
            @click="removeSelectedItems"
          >
            {{ selectedLineCount === 1 ? 'Delete selected product' : 'Delete selected products' }}
          </button>
        </div>

        <article
          v-for="item in cartItems"
          :key="item.lineId"
          class="shell-card cart-line"
        >
          <label class="cart-check cart-line__check" :aria-label="`Select ${item.name} for checkout`">
            <input
              type="checkbox"
              :checked="isItemSelected(item)"
              @change="toggleItem(item, $event.target.checked)"
            />
          </label>

          <router-link :to="productLink(item)" class="cart-line__visual-link" :aria-label="`View ${item.name}`">
            <product-visual :product="item" compact class="cart-line__visual" />
          </router-link>

          <div class="cart-line__copy">
            <p class="cart-line__brand">HEM</p>

            <router-link :to="productLink(item)" class="cart-line__name cart-line__name-link">
              {{ item.name }}
            </router-link>

            <div class="cart-line__unit-price">
              <span
                v-if="priceLabel(item)"
                class="cart-price-label"
                :class="`price-label--${itemPriceTone(item)}`"
              >{{ priceLabel(item) }}</span>
              <span class="cart-price-line">
                <strong class="price-current" :class="`price-current--${itemPriceTone(item)}`">
                  {{ formatCurrency(itemPrice(item)) }}
                </strong>
                <span
                  v-if="hasComparePrice(item)"
                  class="cart-price-compare price-compare price-compare--sale"
                >{{ formatCurrency(itemComparePrice(item)) }}</span>
              </span>
            </div>

            <dl class="cart-line__meta">
              <div v-if="item.productCode" class="cart-line__meta-row">
                <dt>Product code</dt>
                <dd>{{ item.productCode }}</dd>
              </div>
              <div class="cart-line__meta-row">
                <dt>Color</dt>
                <dd>{{ item.color || item.colorName || 'Default' }}</dd>
              </div>
              <div v-if="shouldDisplaySize(item.size || item.sizeLabel)" class="cart-line__meta-row">
                <dt>Size</dt>
                <dd>{{ item.size || item.sizeLabel }}</dd>
              </div>
              <div class="cart-line__meta-row cart-line__meta-row--stepper">
                <dt>Quantity</dt>
                <dd>
                  <div class="cart-line__stepper">
                    <button
                      type="button"
                      class="cart-line__step-btn"
                      :disabled="item.quantity <= 1"
                      aria-label="Decrease quantity"
                      @click="changeQuantity(item, item.quantity - 1)"
                    >
                      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3.5 8h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                      </svg>
                    </button>
                    <span class="cart-line__step-count">{{ item.quantity }}</span>
                    <button
                      type="button"
                      class="cart-line__step-btn"
                      :disabled="!canIncrease(item)"
                      aria-label="Increase quantity"
                      @click="changeQuantity(item, item.quantity + 1)"
                    >
                      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                      </svg>
                    </button>
                  </div>
                  <p v-if="!canIncrease(item)" class="cart-line__stock-limit">
                    {{ stockLimitLabel(item) }}
                  </p>
                </dd>
              </div>
              <div class="cart-line__meta-row">
                <dt>Total</dt>
                <dd class="cart-line__total">
                  <span class="cart-price-line cart-price-line--right">
                    <strong class="price-current" :class="`price-current--${itemPriceTone(item)}`">
                      {{ formatCurrency(itemPrice(item) * item.quantity) }}
                    </strong>
                    <span
                      v-if="hasComparePrice(item)"
                      class="cart-price-compare price-compare price-compare--sale"
                    >{{ formatCurrency(itemComparePrice(item) * item.quantity) }}</span>
                  </span>
                </dd>
              </div>
            </dl>

            <button
              type="button"
              class="cart-line__remove"
              :aria-label="`Remove ${item.name} from bag`"
              title="Remove item"
              @click="removeItem(item.lineId, item.name)"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v5M14 11v5"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
        </article>

        <!-- Clear bag -->
        <div class="cart-actions">
          <button type="button" class="cart-clear" @click="clearCart">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
            Clear bag
          </button>
        </div>
      </div>

      <cart-summary
        class="cart-summary--shopping-bag"
        :subtotal-only="true"
        :show-shipping-progress="true"
        :item-count="itemCount"
        :subtotal="subtotal"
        :shipping="shipping"
        :total="total"
        :checkout-disabled="selectedLineCount === 0"
        checkout-disabled-message="Select at least one item to checkout"
      />
    </section>

    <transition name="cart-confirm">
      <div v-if="pendingCartAction" class="cart-confirm-backdrop" @click.self="closeCartConfirm">
        <section class="cart-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="cart-confirm-title">
          <p class="eyebrow">Shopping bag</p>
          <h2 id="cart-confirm-title">{{ pendingCartAction.title }}</h2>
          <p>{{ pendingCartAction.message }}</p>
          <div class="cart-confirm-dialog__actions">
            <button type="button" class="cart-confirm-dialog__ghost" @click="closeCartConfirm">Cancel</button>
            <button type="button" class="cart-confirm-dialog__danger" @click="confirmCartAction">
              {{ pendingCartAction.confirmLabel }}
            </button>
          </div>
        </section>
      </div>
    </transition>
  </div>
</template>

<script>
import PageBreadcrumbs from '../../components/common/PageBreadcrumbs.vue';
import CartSummary from '../../components/cart/CartSummary.vue';
import ProductVisual from '../../components/product/ProductVisual.vue';
import {
  canIncrease,
  cartItemCount,
  cartProductLink,
  cartShipping,
  cartSubtotal,
  cartTotal,
  hasComparePrice,
  itemComparePrice,
  itemPriceTone,
  itemPrice,
  maxQuantity,
  priceLabel,
  stockLimitLabel,
  stockQuantity
} from '../../helpers/cart/cartItemHelpers';
import { cartStore } from '../../stores/cartStore';
import { formatCurrency } from '../../utils/formatCurrency';
import { shouldDisplaySize } from '../../helpers/sizes';

export default {
  name: 'CartView',
  components: {
    PageBreadcrumbs,
    CartSummary,
    ProductVisual
  },
  data() {
    return {
      cartItems: cartStore.getItems(),
      selectedCartItemIds: cartStore.getSelectedItemIds(),
      isCartLoading: !cartStore.isHydrated(),
      pendingCartAction: null
    };
  },
  computed: {
    breadcrumbItems() {
      return [
        { label: 'hem.com', route: { path: '/women' } },
        { label: 'cart', current: true }
      ];
    },
    itemCount() {
      return cartItemCount(this.selectedItems);
    },
    selectedItems() {
      const selectedIds = new Set(this.selectedCartItemIds);
      return this.cartItems.filter(item => selectedIds.has(this.cartItemId(item)));
    },
    selectedLineCount() {
      return this.selectedItems.length;
    },
    allItemsSelected() {
      return this.cartItems.length > 0 && this.selectedLineCount === this.cartItems.length;
    },
    someItemsSelected() {
      return this.selectedLineCount > 0;
    },
    subtotal() {
      return cartSubtotal(this.selectedItems);
    },
    shipping() {
      return cartShipping(this.subtotal);
    },
    total() {
      return cartTotal(this.subtotal);
    }
  },
  methods: {
    formatCurrency,
    shouldDisplaySize,
    itemPrice,
    itemComparePrice,
    hasComparePrice,
    itemPriceTone,
    priceLabel,
    async syncCart() {
      if (!cartStore.isHydrated()) {
        this.isCartLoading = true;
      }

      try {
        await cartStore.sync();
        this.cartItems = cartStore.getItems();
        this.selectedCartItemIds = cartStore.getSelectedItemIds();
      } finally {
        this.isCartLoading = false;
      }
    },
    productLink: cartProductLink,
    stockQuantity,
    maxQuantity,
    canIncrease,
    stockLimitLabel,
    cartItemId(item) {
      return String(item && (item.cartItemId || item.lineId || item.id) || '');
    },
    isItemSelected(item) {
      return this.selectedCartItemIds.includes(this.cartItemId(item));
    },
    toggleItem(item, selected) {
      cartStore.setItemSelected(this.cartItemId(item), selected);
      this.selectedCartItemIds = cartStore.getSelectedItemIds();
    },
    toggleAllItems(selected) {
      cartStore.setAllItemsSelected(selected);
      this.selectedCartItemIds = cartStore.getSelectedItemIds();
    },
    async changeQuantity(item, quantity) {
      const previousQuantity = Number(item.quantity || 1);
      const nextQuantity = Math.max(1, Math.min(this.maxQuantity(item), Number(quantity) || 1));

      if (nextQuantity === previousQuantity) {
        return;
      }

      item.quantity = nextQuantity;
      await cartStore.updateQuantity(item.lineId, nextQuantity);
      this.cartItems = cartStore.getItems();
      this.selectedCartItemIds = cartStore.getSelectedItemIds();
    },
    removeItem(lineId, itemName) {
      this.pendingCartAction = {
        type: 'remove-item',
        lineId,
        title: 'Remove item?',
        message: `Remove "${itemName}" from your bag?`,
        confirmLabel: 'Remove item'
      };
    },
    removeSelectedItems() {
      const lineIds = this.selectedItems.map(item => this.cartItemId(item)).filter(Boolean);

      if (!lineIds.length) {
        return;
      }

      this.pendingCartAction = {
        type: 'remove-selected',
        lineIds,
        title: lineIds.length === 1 ? 'Remove selected item?' : 'Remove selected items?',
        message: lineIds.length === 1
          ? 'Remove the selected product from your bag?'
          : `Remove ${lineIds.length} selected products from your bag?`,
        confirmLabel: lineIds.length === 1 ? 'Remove item' : 'Remove selected'
      };
    },
    clearCart() {
      this.pendingCartAction = {
        type: 'clear-bag',
        title: 'Clear bag?',
        message: 'Remove all items from your shopping bag?',
        confirmLabel: 'Clear bag'
      };
    },
    closeCartConfirm() {
      this.pendingCartAction = null;
    },
    async confirmCartAction() {
      const action = this.pendingCartAction;

      if (!action) {
        return;
      }

      this.pendingCartAction = null;

      if (action.type === 'remove-item') {
        await cartStore.removeItem(action.lineId);
        this.flash('Item removed.', 'success');
      } else if (action.type === 'remove-selected') {
        for (const lineId of action.lineIds || []) {
          await cartStore.removeItem(lineId);
        }
        this.flash('Selected products removed.', 'success');
      } else if (action.type === 'clear-bag') {
        await cartStore.clear();
        this.flash('Bag cleared.', 'success');
      }

      this.cartItems = cartStore.getItems();
      this.selectedCartItemIds = cartStore.getSelectedItemIds();
    }
  },
  created() {
    this.handleCartUpdate = () => {
      this.cartItems = cartStore.getItems();
      this.selectedCartItemIds = cartStore.getSelectedItemIds();
      this.isCartLoading = false;
    };
    this.handleCartSession = async () => { await this.syncCart(); };

    if (typeof window !== 'undefined') {
      window.addEventListener('cart-updated', this.handleCartUpdate);
      window.addEventListener('auth-updated', this.handleCartSession);
      window.addEventListener('storage', this.handleCartSession);
    }
  },
  beforeUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('cart-updated', this.handleCartUpdate);
      window.removeEventListener('auth-updated', this.handleCartSession);
      window.removeEventListener('storage', this.handleCartSession);
    }
  },
  mounted() {
    this.syncCart();
  }
};
</script>

<style scoped src="@/assets/styles/cart/Cart.css"></style>
