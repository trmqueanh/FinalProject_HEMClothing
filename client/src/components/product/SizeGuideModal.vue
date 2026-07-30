<template>
  <Teleport to="body">
    <div class="size-guide-overlay" @click.self="$emit('close')">
      <div class="size-guide-panel" role="dialog" aria-modal="true" aria-label="Size guide">

        <div class="size-guide-panel__header">
          <span class="size-guide-panel__title">{{ modalTitle }}</span>
          <button type="button" class="size-guide-panel__close" aria-label="Close size guide" @click="$emit('close')">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </button>
        </div>

        <div class="size-guide-panel__body">
          <p v-if="isLoading" class="size-guide-panel__note">Loading size guide...</p>

          <template v-else-if="hasGuideTable">
            <p class="size-guide-panel__note">{{ unitLabel }}</p>
            <div class="size-guide-panel__table-wrap">
              <table class="size-guide-table">
                <thead>
                  <tr>
                    <th v-for="column in columns" :key="column">{{ column }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, rowIndex) in rows" :key="rowIndex">
                    <td v-for="(column, columnIndex) in columns" :key="`${rowIndex}-${column}`">
                      {{ cellValue(row, columnIndex) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <p v-else class="size-guide-panel__note size-guide-panel__empty">Size guide is not available for this category.</p>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script>
export default {
  name: 'SizeGuideModal',
  props: {
    guide: { type: Object, default: null },
    isLoading: { type: Boolean, default: false }
  },
  emits: ['close'],
  computed: {
    guideData() {
      return (this.guide && (this.guide.guideData || this.guide.guide_data)) || {};
    },
    columns() {
      return Array.isArray(this.guideData.columns) ? this.guideData.columns.map(c => String(c || '')) : [];
    },
    rows() {
      return Array.isArray(this.guideData.rows) ? this.guideData.rows.filter(r => Array.isArray(r)) : [];
    },
    hasGuideTable() {
      return Boolean(this.guide && this.columns.length && this.rows.length);
    },
    modalTitle() {
      return this.guide && this.guide.title ? this.guide.title : 'Size Guide';
    },
    unitLabel() {
      const unit = String((this.guide && this.guide.unit) || '').trim();
      return unit ? `Measurements are in ${unit}.` : 'Measurements are shown in the table below.';
    }
  },
  mounted() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeydown);
      document.body.style.overflow = 'hidden';
    }
  },
  beforeUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeydown);
      document.body.style.overflow = '';
    }
  },
  methods: {
    cellValue(row, index) {
      return String((Array.isArray(row) ? row[index] : '') || '');
    },
    handleKeydown(event) {
      if (event.key === 'Escape') this.$emit('close');
    }
  }
};
</script>

<style scoped>
/* Overlay */
.size-guide-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 9999;
  background: rgba(20, 20, 20, 0.4);
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
  overflow: hidden;
}

/* Panel */
.size-guide-panel {
  background: var(--color-bg-canvas, #ffffff);
  width: min(480px, 100%);
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family: var(--font-family-primary, 'Helvetica Neue', Helvetica, Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
  font-size: var(--font-size-md, 16px);
  font-weight: var(--font-weight-base, 400);
  line-height: var(--line-height-base, 1.45);
  box-shadow: -4px 0 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  animation: slideInRight 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes slideInRight {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}

/* Header */
.size-guide-panel__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  border-bottom: 1px solid var(--color-border-subtle, #e2ddd8);
}

.size-guide-panel__title {
  font-family: var(--font-family-primary, inherit);
  font-size: var(--font-size-sm, 14px);
  font-weight: var(--font-weight-strong, 600);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-primary, #111);
  line-height: 1.4;
  padding-right: 16px;
}

.size-guide-panel__close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--color-text-primary, #111);
  cursor: pointer;
  transition: opacity 0.15s ease;
  padding: 0;
}

.size-guide-panel__close:hover {
  opacity: 0.4;
}

/* Body */
.size-guide-panel__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px 28px 48px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  -webkit-overflow-scrolling: touch;
}

.size-guide-panel__note {
  margin: 0;
  color: var(--color-text-secondary, #888);
  font-family: var(--font-family-primary, inherit);
  font-size: var(--font-size-sm, 14px);
  line-height: var(--line-height-base, 1.45);
}

.size-guide-panel__empty {
  padding: 40px 0;
  text-align: center;
}

/* Table — cột dàn đều width */
.size-guide-panel__table-wrap {
  overflow-x: auto;
}

.size-guide-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-family-primary, inherit);
  /* Chia đều tất cả cột */
  table-layout: fixed;
}

.size-guide-table th {
  padding: 10px 8px;
  border-bottom: 1px solid var(--color-border-default, #d8d3cc);
  color: var(--color-text-secondary, #999);
  font-family: var(--font-family-primary, inherit);
  font-size: var(--font-size-xs, 12px);
  font-weight: var(--font-weight-strong, 600);
  letter-spacing: 0.09em;
  text-align: center;
  text-transform: uppercase;
  /* Cột đầu (SIZE) hơi hẹp hơn */
}

.size-guide-table th:first-child,
.size-guide-table td:first-child {
  width: 18%;
}

.size-guide-table td {
  padding: 13px 8px;
  border-bottom: 1px solid var(--color-border-subtle, #edeae5);
  color: var(--color-text-primary, #111);
  font-family: var(--font-family-primary, inherit);
  font-size: var(--font-size-sm, 14px);
  line-height: var(--line-height-base, 1.45);
  text-align: center;
}

.size-guide-table tbody tr:last-child td {
  border-bottom: none;
}

.size-guide-table tbody tr:hover td {
  background: var(--color-state-hover, rgba(0,0,0,0.025));
}
</style>
