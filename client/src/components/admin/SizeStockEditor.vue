<template>
  <div class="studio-form__subsection">
    <div class="studio-form__subsection-head">
      <span>Sizes & stock</span>
    </div>

    <div class="studio-form__size-picker" aria-label="Choose sizes">
      <p class="studio-form__hint">Choose sizes</p>
      <div class="studio-form__size-chip-grid">
        <button
          v-for="sizeOption in commonSizeOptions"
          :key="sizeOption"
          type="button"
          class="studio-form__size-chip"
          :class="{ 'studio-form__size-chip--active': isSizeSelected(color, sizeOption) }"
          :aria-pressed="isSizeSelected(color, sizeOption) ? 'true' : 'false'"
          :disabled="isSizeSelected(color, sizeOption)"
          @click="$emit('add-size-option', sizeOption)"
        >
          {{ sizeOption }}
        </button>
      </div>

      <div class="studio-form__custom-size">
        <input
          :value="color.customSizeInput"
          type="text"
          placeholder="Custom size, e.g. XXS, 35, 34-36, Free Size"
          @input="$emit('update-custom-size', $event.target.value.trim())"
          @keydown.enter.prevent="$emit('add-custom-size')"
        />
        <button type="button" class="secondary-button secondary-button--compact" @click="$emit('add-custom-size')">
          Add custom size
        </button>
      </div>
    </div>

    <div v-if="color.sizes.length" class="studio-form__size-list">
      <div v-for="(size, sizeIndex) in color.sizes" :key="size.localKey" class="studio-form__size-row">
        <div class="studio-form__size-label">
          <span>Size label</span>
          <strong>{{ size.sizeLabel }}</strong>
        </div>
        <label>
          <span>Stock quantity</span>
          <input v-model.number="size.stockQuantity" type="number" min="0" step="1" />
        </label>
        <button type="button" class="text-button text-button--danger" @click="$emit('remove-size', sizeIndex)">
          Remove
        </button>
      </div>
    </div>
    <p v-else class="studio-form__hint">No sizes selected yet. Choose one or add a custom size.</p>
  </div>
</template>

<script>
export default {
  name: 'SizeStockEditor',
  props: {
    color: {
      type: Object,
      required: true
    },
    colorIndex: {
      type: Number,
      required: true
    },
    commonSizeOptions: {
      type: Array,
      default: () => []
    },
    isSizeSelected: {
      type: Function,
      required: true
    }
  },
  emits: ['add-size-option', 'add-custom-size', 'update-custom-size', 'remove-size']
};
</script>

<style scoped>
.studio-form__subsection {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid rgba(17, 17, 17, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.54);
}

.studio-form__subsection-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.studio-form__subsection-head span {
  font-weight: 800;
  letter-spacing: 0.02em;
}

.studio-form__hint {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.studio-form__subsection label,
.studio-form__block {
  display: grid;
  gap: var(--space-1);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

.studio-form__subsection input,
.studio-form__subsection select,
.studio-form__subsection textarea {
  background: var(--color-bg-surface-alt);
  border-radius: 10px;
}

.studio-form__size-list {
  display: grid;
  gap: var(--space-2);
}

.studio-form__size-picker {
  display: grid;
  gap: var(--space-2);
}

.studio-form__size-chip-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.studio-form__size-chip {
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid rgba(17, 17, 17, 0.16);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.74);
  color: var(--color-text-primary);
  cursor: pointer;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: 800;
  transition: background 180ms ease, border-color 180ms ease, color 180ms ease, opacity 180ms ease;
}

.studio-form__size-chip:hover {
  background: rgba(17, 17, 17, 0.06);
  border-color: rgba(17, 17, 17, 0.28);
}

.studio-form__size-chip--active,
.studio-form__size-chip:disabled {
  background: #111 !important;
  border-color: #111 !important;
  color: #fff !important;
  cursor: not-allowed !important;
  pointer-events: none;
  opacity: 1 !important;
}

.studio-form__size-chip--active::after,
.studio-form__size-chip:disabled::after {
  content: ' ✓';
  font-size: 10px;
  opacity: 0.65;
}

.studio-form__custom-size {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) auto;
  gap: var(--space-2);
  align-items: end;
}

.studio-form__size-row {
  display: grid;
  grid-template-columns: minmax(100px, 0.8fr) minmax(130px, 0.8fr) minmax(180px, 1.4fr) auto;
  gap: var(--space-2);
  align-items: end;
}

.studio-form__size-label {
  display: grid;
  gap: var(--space-1);
  min-height: 54px;
  align-content: center;
  padding: 0 14px;
  border: 1px solid rgba(17, 17, 17, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.74);
}

.studio-form__size-label span {
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.studio-form__size-label strong {
  font-size: 15px;
}

.secondary-button--compact {
  min-height: 38px;
  padding: 0 14px;
}

.text-button {
  border: 1px solid rgba(17,17,17,0.14);
  background: #fff;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 4px 9px;
  border-radius: 6px;
  text-decoration: none;
  transition: background 0.14s, border-color 0.14s, color 0.14s;
}

.text-button:hover {
  background: #ffffff;
  border-color: rgba(17,17,17,0.22);
  color: var(--color-text-primary);
}

.text-button--danger {
  border-color: rgba(180, 35, 24, 0.18);
  color: #b42318;
  background: #fff;
}

.text-button--danger:hover {
  background: rgba(196, 18, 48, 0.08);
  border-color: #c41230;
  color: #c41230;
}

.text-button--danger:active {
  background: rgba(196, 18, 48, 0.12);
}

.text-button:disabled {
  color: var(--color-text-secondary);
  cursor: not-allowed;
  opacity: 0.45;
}

@media (max-width: 760px) {
  .studio-form__subsection-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .studio-form__size-row {
    grid-template-columns: 1fr;
  }

  .studio-form__custom-size {
    grid-template-columns: 1fr;
  }
}
</style>
