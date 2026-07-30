<template>
  <nav v-if="totalPages > 1" class="shop-pagination" aria-label="Catalog pagination">
    <div class="shop-pagination__top">
      <div class="shop-pagination__meta">
        <strong>{{ summaryLabel }}</strong>
        <span>Page {{ currentPage }} of {{ totalPages }}</span>
      </div>

      <div class="shop-pagination__actions">
        <button
          type="button"
          class="shop-pagination__arrow"
          :disabled="currentPage <= 1"
          aria-label="Previous page"
          @click="$emit('change-page', currentPage - 1)"
        >
          &lt;
        </button>

        <button
          v-for="page in visiblePages"
          :key="page"
          type="button"
          class="shop-pagination__page"
          :class="{ 'shop-pagination__page--active': page === currentPage }"
          :aria-current="page === currentPage ? 'page' : undefined"
          @click="$emit('change-page', page)"
        >
          {{ page }}
        </button>

        <button
          type="button"
          class="shop-pagination__arrow"
          :disabled="currentPage >= totalPages"
          aria-label="Next page"
          @click="$emit('change-page', currentPage + 1)"
        >
          &gt;
        </button>
      </div>
    </div>

    <div class="shop-pagination__progress" aria-hidden="true">
      <span :style="{ width: progressWidth }"></span>
    </div>
  </nav>
</template>

<script>
export default {
  name: 'ShopPagination',
  props: {
    currentPage: {
      type: Number,
      default: 1
    },
    totalPages: {
      type: Number,
      default: 1
    },
    summaryLabel: {
      type: String,
      default: ''
    }
  },
  emits: ['change-page'],
  computed: {
    visiblePages() {
      const total = Math.max(1, Number(this.totalPages) || 1);
      const current = Math.min(Math.max(1, Number(this.currentPage) || 1), total);
      const end = Math.min(total, Math.max(5, current + 2));
      const start = Math.max(1, end - 4);

      return Array.from({ length: end - start + 1 }, (_, index) => start + index);
    },
    progressWidth() {
      const total = Math.max(1, Number(this.totalPages) || 1);
      const current = Math.min(Math.max(1, Number(this.currentPage) || 1), total);
      return `${(current / total) * 100}%`;
    }
  }
};
</script>

<style scoped>
.shop-pagination {
  display: grid;
  gap: 16px;
  margin-top: 8px;
}

.shop-pagination__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.shop-pagination__meta {
  display: grid;
  gap: 4px;
}

.shop-pagination__meta strong,
.shop-pagination__meta span {
  margin: 0;
}

.shop-pagination__meta strong {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.shop-pagination__meta span {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.shop-pagination__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.shop-pagination__arrow,
.shop-pagination__page {
  min-width: 42px;
  min-height: 42px;
  padding: 0 14px;
  border: 1px solid var(--color-border-default);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.76);
  color: #111111;
  cursor: pointer;
}

.shop-pagination__page--active {
  background: #111111;
  border-color: #111111;
  color: #ffffff;
}

.shop-pagination__arrow:disabled,
.shop-pagination__page:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.shop-pagination__progress {
  position: relative;
  width: 100%;
  height: 4px;
  border-radius: 999px;
  background: rgba(17, 17, 17, 0.08);
  overflow: hidden;
}

.shop-pagination__progress span {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 999px;
  background: #111111;
}

@media (min-width: 1440px) {
  .shop-pagination {
    gap: clamp(20px, 1.4vw, 28px);
    margin-inline: clamp(18px, 2.4vw, 44px) !important;
  }

  .shop-pagination__top {
    gap: 24px;
  }

  .shop-pagination__meta {
    gap: 7px;
  }

  .shop-pagination__meta strong {
    font-size: clamp(17px, 0.9rem + 0.16vw, 20px);
    line-height: 1.3;
    letter-spacing: 0.045em;
  }

  .shop-pagination__meta span {
    font-size: clamp(16px, 0.84rem + 0.12vw, 18px);
    line-height: 1.4;
  }

  .shop-pagination__actions {
    gap: 10px;
  }

  .shop-pagination__arrow,
  .shop-pagination__page {
    min-width: clamp(48px, 2.7vw, 54px);
    min-height: clamp(48px, 2.7vw, 54px);
    padding-inline: 16px;
    font-size: clamp(16px, 0.85rem + 0.12vw, 18px);
    font-weight: 700;
  }

  .shop-pagination__progress {
    height: 6px;
  }
}
</style>
