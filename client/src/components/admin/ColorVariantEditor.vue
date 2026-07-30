<template>
  <section class="studio-form__section">
    <div class="studio-form__section-head studio-form__section-head--split">
      <div>
        <span>Color variants</span>
      </div>
      <button type="button" class="secondary-button" @click="$emit('add-color')">Add color</button>
    </div>

    <div class="studio-form__color-list">
      <article v-for="(color, colorIndex) in form.colorVariants" :key="color.localKey" class="studio-form__color-card">
        <div class="studio-form__color-card-head">
          <div>
            <strong>{{ color.name || `Color ${colorIndex + 1}` }}</strong>
            <small v-if="isAccessories">{{ colorStockQuantity(color) }} stock · {{ color.images.length }} images</small>
            <small v-else>{{ color.sizes.length }} sizes · {{ color.images.length }} images</small>
          </div>
          <button
            type="button"
            class="text-button text-button--danger"
            :disabled="form.colorVariants.length <= 1"
            @click="$emit('remove-color', colorIndex)"
          >
            Remove color
          </button>
        </div>

        <div class="studio-form__grid">
          <label>
            <span>Color name</span>
            <input v-model.trim="color.name" type="text" placeholder="Black" @input="$emit('sync-color-image-names', colorIndex)" />
          </label>

          <label>
            <span>Color family</span>
            <select :value="colorFamilyValue(color)" @change="$emit('update-color-family', colorIndex, $event.target.value)">
              <option v-for="family in colorFamilyOptions" :key="family" :value="family">{{ family }}</option>
            </select>
          </label>

          <label class="studio-form__hex-field">
            <span>Color hex <small>optional</small></span>
            <div class="studio-form__hex-control">
              <i :style="{ background: colorPreviewHex(color) }" aria-hidden="true"></i>
              <input
                :value="color.hex"
                type="text"
                placeholder="Auto from family"
                @input="$emit('update-color-hex', colorIndex, $event.target.value)"
              />
            </div>
          </label>

          <label class="studio-form__code-field">
            <span>Product code <small>auto</small></span>
            <input
              :value="color.productCode"
              type="text"
              placeholder="Auto generated"
              @input="$emit('update-product-code', colorIndex, $event.target.value)"
            />
          </label>

          <label>
            <span>Sale price <small>optional</small></span>
            <input
              :value="color.salePrice ?? ''"
              type="number"
              min="0"
              step="1000"
              placeholder="No color sale"
              @input="$emit('update-color-price', colorIndex, 'salePrice', $event.target.value)"
            />
          </label>

        </div>

        <ProductImageUploader
          :color="color"
          :color-index="colorIndex"
          :product-name="form.name"
          @upload-images="$emit('upload-images', $event, colorIndex)"
          @set-primary-image="$emit('set-primary-image', colorIndex, $event)"
          @remove-image="$emit('remove-image', colorIndex, $event)"
        />

        <div v-if="isAccessories" class="studio-form__subsection studio-form__accessory-stock">
          <div class="studio-form__subsection-head">
            <span>Stock</span>
          </div>

          <label>
            <span>Stock quantity</span>
            <input
              :value="colorStockQuantity(color)"
              type="number"
              min="0"
              step="1"
              @input="$emit('update-accessory-stock', colorIndex, $event.target.value)"
            />
          </label>
        </div>

        <SizeStockEditor
          v-else
          :color="color"
          :color-index="colorIndex"
          :common-size-options="commonSizeOptions"
          :is-size-selected="isSizeSelected"
          @add-size-option="$emit('add-size-option', colorIndex, $event)"
          @add-custom-size="$emit('add-custom-size', colorIndex)"
          @update-custom-size="$emit('update-custom-size', colorIndex, $event)"
          @remove-size="$emit('remove-size', colorIndex, $event)"
        />
      </article>
    </div>
  </section>
</template>

<script>
import ProductImageUploader from './ProductImageUploader.vue';
import SizeStockEditor from './SizeStockEditor.vue';
import { COLOR_FAMILY_OPTIONS, defaultHexForColorFamily, normalizeColorFamily } from '../../helpers/colors';

export default {
  name: 'ColorVariantEditor',
  components: {
    ProductImageUploader,
    SizeStockEditor
  },
  props: {
    form: {
      type: Object,
      required: true
    },
    commonSizeOptions: {
      type: Array,
      default: () => []
    },
    isSizeSelected: {
      type: Function,
      required: true
    },
    productGroupSlug: {
      type: String,
      default: 'clothing'
    }
  },
  emits: [
    'add-color',
    'remove-color',
    'sync-color-image-names',
    'update-color-family',
    'update-color-hex',
    'update-color-price',
    'update-product-code',
    'upload-images',
    'set-primary-image',
    'remove-image',
    'add-size-option',
    'add-custom-size',
    'update-custom-size',
    'remove-size',
    'update-accessory-stock'
  ],
  computed: {
    colorFamilyOptions() {
      return COLOR_FAMILY_OPTIONS;
    },
    isAccessories() {
      return String(this.productGroupSlug || '').trim().toLowerCase() === 'accessories';
    }
  },
  methods: {
    colorFamilyValue(color) {
      return normalizeColorFamily(color && color.family, color && color.name);
    },
    colorPreviewHex(color) {
      return color && color.hex ? color.hex : defaultHexForColorFamily(this.colorFamilyValue(color));
    },
    colorStockQuantity(color) {
      return (Array.isArray(color && color.sizes) ? color.sizes : []).reduce(
        (total, size) => total + Math.max(0, Number.parseInt(size.stockQuantity, 10) || 0),
        0
      );
    }
  }
};
</script>

<style scoped>
.studio-form__section {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border-default);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.58);
}

.studio-form__section-head,
.studio-form__section-head--split,
.studio-form__color-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.studio-form__section-head span {
  font-weight: 800;
  letter-spacing: 0.02em;
}

.studio-form__section-head p {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.studio-form__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: var(--space-3);
}

.studio-form__section label,
.studio-form__block {
  display: grid;
  gap: var(--space-1);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

.studio-form__section input,
.studio-form__section select,
.studio-form__section textarea {
  background: var(--color-bg-surface-alt);
  border-radius: 10px;
}

.studio-form input[type='color'] {
  min-height: 54px;
  padding: var(--space-1);
}

.studio-form__section label small,
.studio-form__hex-field small,
.studio-form__code-field small {
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}

.studio-form__code-field > small {
  margin-top: -2px;
  line-height: 1.35;
}

.studio-form__hex-control {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.studio-form__hex-control i {
  width: 42px;
  height: 42px;
  border: 1px solid rgba(17, 17, 17, 0.16);
  border-radius: 8px;
}

.studio-form__color-list {
  display: grid;
  gap: var(--space-3);
}

.studio-form__color-card {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid rgba(17, 17, 17, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.54);
}

.studio-form__color-card-head strong {
  display: block;
  font-size: 15px;
}

.studio-form__color-card-head small {
  color: var(--color-text-secondary);
}

.studio-form__subsection {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid rgba(17, 17, 17, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.54);
}

.studio-form__subsection-head span {
  font-weight: 800;
  letter-spacing: 0.02em;
}

.studio-form__accessory-stock {
  max-width: 260px;
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
  .studio-form__section-head--split,
  .studio-form__color-card-head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
