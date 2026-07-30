<template>
  <div class="product-detail__accordions">
    <details class="accordion" :open="openSection === 'description'" @toggle="handleToggle('description', $event)">
      <summary class="accordion__summary">
        <span>Description &amp; Fit</span>
        <span class="accordion__icon" aria-hidden="true"></span>
      </summary>
      <div class="accordion__body">
        <span v-if="tagLabel" class="accordion__tag">{{ tagLabel }}</span>
        <p class="accordion__text">{{ product.description }}</p>
        <dl class="accordion__meta">
          <div v-if="productCode"><dt>Product code</dt><dd>{{ productCode }}</dd></div>
          <div v-if="colorsText"><dt>Colors</dt><dd>{{ colorsText }}</dd></div>
          <div v-if="sizesText"><dt>Sizes</dt><dd>{{ sizesText }}</dd></div>
          <template v-if="isClothing">
            <div v-if="fitName"><dt>Fit</dt><dd>{{ fitName }}</dd></div>
            <div v-if="styleName"><dt>Style</dt><dd>{{ styleName }}</dd></div>
            <div v-if="!isPantsCategory && sleeveLength"><dt>Sleeve length</dt><dd>{{ sleeveLength }}</dd></div>
            <div v-if="garmentLength"><dt>Length</dt><dd>{{ garmentLength }}</dd></div>
            <div v-if="isPantsCategory && waistRise"><dt>Waist rise</dt><dd>{{ waistRise }}</dd></div>
            <div v-if="!isPantsCategory && neckline"><dt>Neckline</dt><dd>{{ neckline }}</dd></div>
          </template>
          <template v-else-if="isShoes">
            <div v-if="product.heelHeight || product.heel_height">
              <dt>Heel height</dt><dd>{{ product.heelHeight || product.heel_height }}</dd>
            </div>
            <div v-if="typeName"><dt>Footwear type</dt><dd>{{ typeName }}</dd></div>
          </template>
          <div v-else-if="isAccessories && typeName"><dt>Accessory type</dt><dd>{{ typeName }}</dd></div>
        </dl>
      </div>
    </details>

    <details class="accordion" :open="openSection === 'materials'" @toggle="handleToggle('materials', $event)">
      <summary class="accordion__summary">
        <span>Materials</span>
        <span class="accordion__icon" aria-hidden="true"></span>
      </summary>
      <div class="accordion__body">
        <div v-if="materialGroups.length" class="accordion__materials">
          <section v-for="group in materialGroups" :key="group.part_name || group.partName" class="accordion__material-group">
            <h4>{{ group.part_name || group.partName }}</h4>
            <ul class="accordion__list">
              <li v-for="material in group.materials" :key="`${material.material_id || material.name}-${material.percent}`">
                {{ formatMaterialLine(material) }}
              </li>
            </ul>
          </section>
        </div>
        <section v-if="hasMaterialInformation" class="accordion__material-info">
          <h4>{{ materialInformation.title }}</h4>
          <p class="accordion__text accordion__text--material-info">{{ materialInformation.content }}</p>
        </section>
        <p v-if="!materialGroups.length && !hasMaterialInformation" class="accordion__text">
          Material information is not available for this product.
        </p>
      </div>
    </details>

    <details class="accordion" :open="openSection === 'care'" @toggle="handleToggle('care', $event)">
      <summary class="accordion__summary">
        <span>Care Guide</span>
        <span class="accordion__icon" aria-hidden="true"></span>
      </summary>
      <div class="accordion__body">
        <ul class="accordion__list">
          <li v-for="item in careGuideItems" :key="item">{{ item }}</li>
        </ul>
      </div>
    </details>

    <details class="accordion" :open="openSection === 'delivery'" @toggle="handleToggle('delivery', $event)">
      <summary class="accordion__summary">
        <span>Delivery & Payment</span>
        <span class="accordion__icon" aria-hidden="true"></span>
      </summary>
      <div class="accordion__body">
        <p class="accordion__text">Prices include VAT. Shipping is calculated at checkout.</p>
        <p class="accordion__text">Bank Transfer (QR Code) and Cash on Delivery are available for eligible orders. Delivery time depends on your selected address and courier availability.</p>
      </div>
    </details>
  </div>
</template>

<script>
export default {
  name: 'ProductAccordions',
  props: {
    product: {
      type: Object,
      required: true
    },
    productCode: {
      type: String,
      default: ''
    },
    selectedColor: {
      type: String,
      default: ''
    },
    availableColors: {
      type: Array,
      default: () => []
    },
    availableSizes: {
      type: Array,
      default: () => []
    },
    productGroupSlug: {
      type: String,
      default: 'clothing'
    },
    tagLabel: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      openSection: 'description'
    };
  },
  watch: {
    'product.id'() {
      this.openSection = 'description';
    }
  },
  computed: {
    normalizedProductGroup() {
      return String(this.productGroupSlug || '').trim().toLowerCase();
    },
    isClothing() {
      return this.normalizedProductGroup === 'clothing';
    },
    isPantsCategory() {
      if (!this.isClothing) {
        return false;
      }

      const values = [
        this.product.categorySlug,
        this.product.category_slug,
        this.product.category,
        this.product.categoryLabel,
        this.product.category_label
      ];

      return values.some(value => {
        const normalized = String(value || '').trim().toLowerCase();
        return ['pants', 'trousers', 'jeans', 'shorts', 'bottoms', 'leggings', 'joggers', 'skirt', 'skirts']
          .some(keyword => normalized.includes(keyword));
      });
    },
    isShoes() {
      return this.normalizedProductGroup === 'shoes';
    },
    isAccessories() {
      return this.normalizedProductGroup === 'accessories';
    },
    careGuideItems() {
      if (this.isShoes) {
        return [
          'Wipe clean with a soft, damp cloth.',
          'Avoid soaking or machine washing.',
          'Air dry naturally away from direct heat.',
          'Store in a cool, dry place when not in use.'
        ];
      }

      if (this.isAccessories) {
        return [
          'Wipe gently with a soft, dry cloth.',
          'Keep away from water, perfume, and direct sunlight.',
          'Store separately to avoid scratches or color transfer.',
          'Use the dust bag or original packaging when available.'
        ];
      }

      return [
        'Wash with similar colors.',
        'Use a gentle cycle and mild detergent.',
        'Do not bleach.',
        'Air dry or tumble dry on low heat.'
      ];
    },
    fitName() {
      return String(this.product.fitName || this.product.fit_name || this.product.fit || '').trim();
    },
    styleName() {
      return String(this.product.styleName || this.product.style_name || '').trim();
    },
    colorsText() {
      const colors = (Array.isArray(this.availableColors) ? this.availableColors : [])
        .map(color => String(color || '').trim())
        .filter(Boolean);
      const fallback = String(this.selectedColor || '').trim();
      const uniqueColors = [...new Set(colors.length ? colors : fallback ? [fallback] : [])];

      return uniqueColors.join(', ');
    },
    sizesText() {
      const sizes = (Array.isArray(this.availableSizes) ? this.availableSizes : [])
        .map(size => String(size || '').trim())
        .filter(Boolean);

      return [...new Set(sizes)].join(', ');
    },
    sleeveLength() {
      return String(this.product.sleeveLength || this.product.sleeve_length || '').trim();
    },
    garmentLength() {
      return String(this.product.garmentLength || this.product.garment_length || this.product.length || '').trim();
    },
    neckline() {
      return String(this.product.neckline || '').trim();
    },
    waistRise() {
      return String(this.product.waistRise || this.product.waist_rise || (this.isPantsCategory ? this.product.neckline : '') || '').trim();
    },
    typeName() {
      return this.styleName || String(this.product.categoryLabel || this.product.category || '').trim();
    },
    materialGroups() {
      const source = Array.isArray(this.product.materials) ? this.product.materials : [];
      const legacyStrings = source.filter(item => typeof item === 'string' && item.trim());

      if (legacyStrings.length) {
        return [{
          part_name: 'Main',
          materials: legacyStrings.map(item => ({
            name: item,
            percent: null
          }))
        }];
      }

      return source
        .filter(group => group && Array.isArray(group.materials) && group.materials.length)
        .map(group => ({
          ...group,
          materials: group.materials.filter(material => material && material.name)
        }))
        .filter(group => group.materials.length);
    },
    materialInformation() {
      const info = this.product.materialInformation || this.product.material_information || {};
      const title = String(info.title || 'ADDITIONAL MATERIAL INFORMATION').trim() || 'ADDITIONAL MATERIAL INFORMATION';
      const content = info.content ?? info.highlight_text ?? '';

      return {
        title,
        content: content === null || content === undefined ? '' : String(content)
      };
    },
    hasMaterialInformation() {
      return this.materialInformation.content.trim().length > 0;
    }
  },
  methods: {
    handleToggle(section, event) {
      const isOpen = Boolean(event && event.target && event.target.open);

      if (isOpen) {
        this.openSection = section;
      } else if (this.openSection === section) {
        this.openSection = '';
      }
    },
    formatMaterialLine(material) {
      const hasPercent = material.percent !== null && material.percent !== undefined && material.percent !== '';
      const percent = hasPercent
        ? `${Number(material.percent).toLocaleString('en-US', { maximumFractionDigits: 2 })}% `
        : '';

      return `${percent}${material.name}`;
    }
  }
};
</script>

<style scoped>
.product-detail__accordions {
  padding-top: 16px;
  display: flex;
  flex-direction: column;
}

.accordion {
  border: none;
  border-bottom: 1px solid var(--color-border-subtle);
  background: transparent;
  overflow: hidden;
}

.accordion:first-child {
  border-top: 1px solid var(--color-border-subtle);
}

.accordion__summary {
  cursor: pointer;
  padding: 18px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-primary);
  list-style: none;
  user-select: none;
}

.accordion__summary::-webkit-details-marker {
  display: none;
}

.accordion__icon {
  position: relative;
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  color: var(--color-text-secondary);
  transition: transform var(--duration-slow) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.accordion__icon::before,
.accordion__icon::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 14px;
  height: 1.5px;
  background: currentColor;
  transform: translate(-50%, -50%);
  transition: opacity var(--duration-fast) ease, transform var(--duration-fast) ease;
}

.accordion__icon::after {
  transform: translate(-50%, -50%) rotate(90deg);
}

.accordion[open] .accordion__icon::after {
  opacity: 0;
  transform: translate(-50%, -50%) rotate(0deg);
}

.accordion__body {
  padding: 0 0 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: var(--color-text-secondary);
  line-height: 1.65;
  animation: accordionReveal var(--duration-base) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.accordion__text {
  margin: 0;
  font-size: 13px;
  white-space: pre-wrap;
}

.accordion__tag {
  align-self: flex-start;
  padding: 5px 9px;
  background: #111111;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.accordion__meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 4px 0 0;
  padding: 0;
}

.accordion__meta > div {
  display: grid;
  grid-template-columns: minmax(150px, 180px) minmax(0, 1fr);
  column-gap: 16px;
  align-items: baseline;
}

.accordion__meta dt {
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
}

.accordion__meta dd {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 12px;
  min-width: 0;
  overflow-wrap: anywhere;
}

.accordion__list {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 13px;
  line-height: 1.8;
}

.accordion__materials {
  display: grid;
  gap: 16px;
}

.accordion__material-group {
  display: grid;
  gap: 8px;
}

.accordion__material-group h4 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 700;
}

.accordion__material-info {
  display: grid;
  gap: 8px;
}

.accordion__material-info h4 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 700;
}

.accordion__text--material-info {
  color: var(--color-text-secondary);
}

@keyframes accordionReveal {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0);    }
}

@media (max-width: 520px) {
  .accordion__meta > div {
    grid-template-columns: minmax(118px, 136px) minmax(0, 1fr);
    column-gap: 12px;
  }
}
</style>
