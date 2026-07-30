<template>
  <section class="profile-panel">
    <div class="profile-panel__top">
      <h1>Coupons</h1>
    </div>

    <div v-if="isLoading" class="profile-empty">
      Loading coupons...
    </div>

    <div v-else-if="!coupons.length" class="profile-empty">
      <h3>No coupons yet.</h3>
      <p>Coupons available to your account will appear here.</p>
    </div>

    <template v-else>
      <div class="coupon-list">
        <CouponCard
          v-for="coupon in paginatedCoupons"
          :key="coupon.id"
          :coupon="coupon"
          :format-label="formatLabel"
          :format-currency="formatCurrency"
          profile-mode
        />
      </div>

      <nav v-if="totalPages > 1" class="profile-list-pagination" aria-label="Coupon pagination">
        <button type="button" :disabled="currentPage <= 1" @click="setPage(currentPage - 1)">Previous</button>
        <span>Page {{ currentPage }} of {{ totalPages }}</span>
        <button type="button" :disabled="currentPage >= totalPages" @click="setPage(currentPage + 1)">Next</button>
      </nav>
    </template>
  </section>
</template>

<script>
import CouponCard from '../common/CouponCard.vue';

export default {
  name: 'CouponList',
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
    formatLabel: {
      type: Function,
      default: value => String(value || '')
    },
    formatCurrency: {
      type: Function,
      default: value => String(value || '')
    }
  },
  data() {
    return {
      currentPage: 1,
      itemsPerPage: 6
    };
  },
  computed: {
    totalPages() {
      return Math.max(1, Math.ceil(this.coupons.length / this.itemsPerPage));
    },
    paginatedCoupons() {
      const safePage = Math.min(Math.max(1, this.currentPage), this.totalPages);
      const start = (safePage - 1) * this.itemsPerPage;
      return this.coupons.slice(start, start + this.itemsPerPage);
    }
  },
  watch: {
    coupons() {
      this.currentPage = 1;
    },
    totalPages(nextValue) {
      if (this.currentPage > nextValue) {
        this.currentPage = nextValue;
      }
    }
  },
  methods: {
    setPage(page) {
      this.currentPage = Math.min(Math.max(1, Number(page) || 1), this.totalPages);
      this.$nextTick(() => {
        this.$el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }
};
</script>

<style scoped>
.profile-panel {
  display: grid;
  gap: 32px;
}

.profile-panel__top {
  display: grid;
  gap: 8px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(17, 17, 17, 0.10);
}

.profile-panel__top h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0;
}

.profile-empty {
  display: grid;
  gap: 14px;
  justify-items: start;
  padding: 42px 0;
}

.profile-empty h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0;
}

.coupon-list {
  display: grid;
  gap: 12px;
}

.profile-list-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding-top: 8px;
}

.profile-list-pagination button {
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 16px;
  border: 1px solid rgba(17, 17, 17, 0.14);
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
}

.profile-list-pagination button:hover:not(:disabled) {
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

.profile-list-pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.profile-list-pagination span {
  font-size: 13px;
  color: var(--color-text-secondary);
}

@media (max-width: 768px) {
  .profile-panel__top h1 {
    font-size: 18px;
  }
}
</style>
