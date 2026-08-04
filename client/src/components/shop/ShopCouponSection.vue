<template>
  <section class="shop-coupons" aria-labelledby="shop-coupons-title">
    <h2 id="shop-coupons-title">Use online discount code now!</h2>

    <p v-if="isLoading" class="shop-coupons__state">Loading coupon codes...</p>

    <p v-else-if="!coupons.length" class="shop-coupons__state">No coupon codes are available right now.</p>

    <div v-else class="shop-coupons__track" role="list">
      <CouponCard
        v-for="coupon in visibleCoupons"
        :key="coupon.id || coupon.code"
        class="shop-coupons__item"
        :coupon="coupon"
        :format-currency="formatCurrency"
        :show-status="false"
        :show-usage-details="false"
        role="listitem"
      />
    </div>
  </section>
</template>

<script>
import CouponCard from '../common/CouponCard.vue';

const STOREFRONT_COUPON_LIMIT = 6;

export default {
  name: 'ShopCouponSection',
  components: {
    CouponCard
  },
  props: {
    coupons: {
      type: Array,
      default: () => []
    },
    isLoading: {
      type: Boolean,
      default: false
    },
    formatCurrency: {
      type: Function,
      required: true
    }
  },
  computed: {
    visibleCoupons() {
      return this.coupons.slice(0, STOREFRONT_COUPON_LIMIT);
    }
  }
};
</script>

<style scoped>
.shop-coupons {
  display: grid;
  gap: clamp(0.9rem, 1.4vw, 1.2rem);
  padding: clamp(1.6rem, 2.4vw, 2.6rem) clamp(0.85rem, 2.5vw, 3.5rem) 0;
}

.shop-coupons h2 {
  margin: 0;
  color: var(--color-ink);
  font-size: clamp(1.35rem, 1.7vw, 1.9rem);
  line-height: 1.05;
  letter-spacing: 0;
  font-weight: 800;
}

@media (min-width: 1440px) {
  .shop-coupons {
    padding-inline: clamp(1rem, 1.2vw, 1.5rem);
  }
}

.shop-coupons__track {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: clamp(320px, 31vw, 440px);
  gap: 14px;
  min-width: 0;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scroll-snap-type: inline proximity;
  padding-bottom: 0.5rem;
  scrollbar-width: none;
}

.shop-coupons__state {
  margin: 0;
  padding: 1rem 0;
  color: var(--color-ink-60);
  font-size: var(--size-12);
  letter-spacing: 0;
}

.shop-coupons__track::-webkit-scrollbar {
  display: none;
}

.shop-coupons__item {
  scroll-snap-align: start;
}

@media (max-width: 720px) {
  .shop-coupons {
    padding-inline: 1rem;
  }

  .shop-coupons__track {
    grid-auto-columns: min(88vw, 390px);
  }
}
</style>
