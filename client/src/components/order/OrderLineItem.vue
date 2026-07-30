<template>
  <article v-if="variant === 'detail'" class="profile-order-line profile-order-line--detail">
    <router-link :to="productLink(item)" class="profile-order-line__media">
      <img v-if="displayImage" :src="displayImage" :alt="item.productName" />
      <ProductVisual v-else :product="item.product || item" compact />
    </router-link>
    <div class="profile-order-line__info">
      <router-link :to="productLink(item)" class="profile-order-line__name">{{ item.productName }}</router-link>
      <p v-if="item.productCode" class="profile-order-line__meta">Product code {{ item.productCode }}</p>
      <p class="profile-order-line__meta">
        Color {{ item.colorName || 'Default' }}<template v-if="shouldDisplaySize(item.sizeLabel)"> · Size {{ item.sizeLabel }}</template>
      </p>
      <p class="profile-order-line__price">
        <span
          v-if="priceLabel(item)"
          class="order-price-label"
          :class="`price-label--${itemPriceTone(item)}`"
        >{{ priceLabel(item) }}</span>
        <span class="order-price-line">
          <span class="price-current" :class="`price-current--${itemPriceTone(item)}`">
            {{ formatCurrency(itemPrice(item)) }}
          </span>
          <span>× {{ item.quantity }}</span>
        </span>
      </p>
    </div>
    <div class="profile-order-line__detail-side">
      <strong class="profile-order-line__line-total">
        <small>Item total</small>
        <span>{{ formatCurrency(itemPrice(item) * item.quantity) }}</span>
      </strong>
      <div v-if="String(order.orderStatus || '').toLowerCase() === 'completed'" class="profile-order-line__detail-actions">
        <button
          v-if="canReviewOrderItem(order, item)"
          type="button"
          class="profile-order-line__review"
          @click="$emit('review', item)"
        >Write Review</button>
        <span v-else-if="isReviewedOrderItem(order, item)" class="profile-order-line__reviewed"> ✓ Reviewed</span>
      </div>
    </div>
  </article>

  <article v-else class="profile-order-line profile-order-line--summary">
    <router-link :to="productLink(item)" class="profile-order-line__media profile-order-line__media--summary">
      <img v-if="displayImage" :src="displayImage" :alt="item.productName" loading="lazy" />
      <ProductVisual v-else :product="item.product || item" compact />
    </router-link>
    <div class="profile-order-line__info">
      <router-link :to="productLink(item)" class="profile-order-line__name">{{ item.productName }}</router-link>
      <p v-if="item.productCode" class="profile-order-line__meta">
        Product code {{ item.productCode }}
      </p>
      <p class="profile-order-line__meta">
        Color {{ item.colorName || 'Default' }}<template v-if="shouldDisplaySize(item.sizeLabel)"> · Size {{ item.sizeLabel }}</template>
      </p>
    </div>
    <div class="profile-order-line__summary-side">
      <span class="profile-order-line__quantity">Qty {{ item.quantity }}</span>
      <small class="profile-order-line__total-label">Item total</small>
      <p class="profile-order-line__price">
        <span
          v-if="priceLabel(item)"
          class="order-price-label"
          :class="`price-label--${itemPriceTone(item)}`"
        >{{ priceLabel(item) }}</span>
        <span class="order-price-line">
          <span class="price-current" :class="`price-current--${itemPriceTone(item)}`">
            {{ formatCurrency(itemPrice(item)) }}
          </span>
        </span>
      </p>
    </div>
  </article>
</template>

<script>
import { itemPriceTone, primaryProductImage } from '../../helpers/cart/cartItemHelpers';
import ProductVisual from '../product/ProductVisual.vue';
import { shouldDisplaySize } from '../../helpers/sizes';

export default {
  name: 'OrderLineItem',
  components: {
    ProductVisual
  },
  props: {
    item: {
      type: Object,
      required: true
    },
    order: {
      type: Object,
      default: () => ({})
    },
    variant: {
      type: String,
      default: 'summary'
    },
    formatCurrency: {
      type: Function,
      required: true
    },
    productLink: {
      type: Function,
      required: true
    },
    itemPrice: {
      type: Function,
      required: true
    },
    priceLabel: {
      type: Function,
      default: () => ''
    },
    canReviewOrderItem: {
      type: Function,
      default: () => false
    },
    isReviewedOrderItem: {
      type: Function,
      default: () => false
    }
  },
  computed: {
    displayImage() {
      return primaryProductImage(this.item);
    }
  },
  methods: {
    itemPriceTone,
    shouldDisplaySize
  },
  emits: ['review']
};
</script>

<style scoped>
.profile-order-line--detail {
  grid-template-columns: 88px minmax(0, 1fr);
  align-items: start;
  column-gap: 18px;
  row-gap: 12px;
  padding: 20px;
  border-bottom: 1px solid rgba(17,17,17,0.06);
}

.profile-order-line--detail:last-child {
  border-bottom: none;
}

.profile-order-line__line-total {
  display: grid;
  justify-items: end;
  gap: 2px;
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  align-self: center;
}

.profile-order-line__line-total small {
  color: var(--color-text-secondary);
  font-size: 10px;
  font-weight: 650;
  line-height: 1.2;
  text-transform: uppercase;
}

.profile-order-line__detail-side {
  grid-column: 2;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.profile-order-line__detail-side .profile-order-line__line-total {
  margin-left: auto;
  justify-items: end;
  text-align: right;
}

.profile-order-line__detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 0;
  justify-content: flex-end;
}

.profile-order-line {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  padding: 14px 0;
  border-top: 1px solid rgba(17,17,17,0.06);
}

.profile-order-line.profile-order-line--detail {
  grid-template-columns: 88px minmax(0, 1fr);
  align-items: start;
}

.profile-order-line.profile-order-line--summary {
  grid-template-columns: 96px minmax(0, 1fr) minmax(128px, auto);
  gap: 18px;
  align-items: center;
  padding: 16px 0;
}

.profile-order-line:first-child {
  border-top: 0;
}

.profile-order-line__media {
  display: block;
  width: 72px;
  height: 90px;
  border-radius: 6px;
  overflow: hidden;
  background: transparent;
  color: inherit;
  text-decoration: none;
}

.profile-order-line--detail .profile-order-line__media {
  width: 88px;
  height: 112px;
  grid-row: 1 / span 2;
}

.profile-order-line__media--summary {
  width: 96px;
  height: 122px;
}

.profile-order-line__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: transparent;
  display: block;
}

.profile-order-line__media :deep(.product-visual),
.profile-order-line__media :deep(.product-visual__images) {
  width: 100%;
  height: 100%;
}

.profile-order-line__media :deep(.product-visual__image) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: transparent;
}

.profile-order-line__media :deep(.product-visual--has-images::after) {
  display: none;
}

.profile-order-line__info {
  display: grid;
  gap: 4px;
  padding-top: 2px;
}

.profile-order-line__name {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  color: var(--color-text-primary);
  text-decoration: none;
  transition: color 160ms ease;
}

.profile-order-line__name:hover {
  color: rgba(17, 17, 17, 0.62);
}

.profile-order-line__meta {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}

.profile-order-line__price {
  display: grid;
  gap: 2px;
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.order-price-label {
  color: #9a6a13;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.order-price-line {
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
}

.profile-order-line__summary-side {
  display: grid;
  justify-items: end;
  gap: 10px;
  color: var(--color-text-primary);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.profile-order-line__quantity {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid rgba(17, 17, 17, 0.14);
  background: #111111;
  color: #ffffff;
  font-weight: 750;
  text-transform: uppercase;
}

.profile-order-line__total-label {
  color: var(--color-text-secondary);
  font-size: 10px;
  font-weight: 750;
  line-height: 1.2;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.profile-order-line--summary .profile-order-line__price {
  justify-items: end;
  gap: 4px;
}

.profile-order-line--summary .order-price-label {
  color: var(--color-text-secondary);
  letter-spacing: 0.04em;
}

.profile-order-line--summary .price-current {
  font-size: 1rem;
  font-weight: 750;
}

.profile-order-line__buy-again,
.profile-order-line__review {
  justify-self: start;
  min-height: 32px;
  padding: 0 11px;
  border: 1px solid rgba(17, 17, 17, 0.16);
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 160ms ease, background 160ms ease, color 160ms ease, border-color 160ms ease;
}

.profile-order-line__buy-again:hover:not(:disabled),
.profile-order-line__review:hover {
  transform: translateY(-1px);
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

.profile-order-line__buy-again:disabled {
  opacity: 0.55;
  cursor: wait;
  transform: none;
}

.profile-order-line__review {
  border-color: #111111;
}

.profile-order-line__reviewed {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 11px;
  border: 1px solid rgba(17, 17, 17, 0.14);
  border-radius: 999px;
  color: rgba(17, 17, 17, 0.58);
  font-size: 11px;
  font-weight: 800;
}

.profile-order-line__unavailable {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  color: rgba(17, 17, 17, 0.48);
  font-size: 11px;
  font-weight: 800;
}

@media (max-width: 768px) {
  .profile-order-line {
    grid-template-columns: 72px minmax(0, 1fr);
  }

  .profile-order-line.profile-order-line--detail {
    grid-template-columns: 76px minmax(0, 1fr);
    column-gap: 14px;
    padding: 16px 14px;
  }

  .profile-order-line.profile-order-line--summary {
    grid-template-columns: 76px minmax(0, 1fr);
    gap: 12px;
  }

  .profile-order-line__line-total {
    justify-self: start;
  }

  .profile-order-line__detail-side {
    grid-column: 2;
    align-items: flex-start;
    flex-direction: column;
    min-width: 0;
  }

  .profile-order-line__detail-side .profile-order-line__line-total {
    margin-left: 0;
    justify-items: start;
    text-align: left;
  }

  .profile-order-line--detail .profile-order-line__media {
    width: 76px;
    height: 98px;
  }

  .profile-order-line__detail-actions {
    justify-content: flex-start;
  }

  .profile-order-line__media {
    width: 72px;
  }

  .profile-order-line__media--summary {
    width: 76px;
    height: 96px;
  }

  .profile-order-line__summary-side {
    grid-column: 2;
    justify-items: start;
    text-align: left;
  }

  .profile-order-line--summary .profile-order-line__price {
    justify-items: start;
  }
}
</style>
