<template>
  <!-- AdminProductPreviewDialog: dialog UI được tách khỏi AdminDashboard.vue, logic vẫn proxy về view cha. -->
  <transition name="admin-confirm">
        <div
          v-if="selectedAdminProductPreview || isLoadingAdminProductPreview"
          :class="embedded ? 'admin-product-detail-embed' : 'admin-confirm-backdrop'"
          @click.self="!embedded && closeAdminProductPreview()"
        >
          <section
            class="admin-product-preview-dialog"
            :class="{ 'admin-confirm-dialog': !embedded, 'admin-product-preview-dialog--page': embedded }"
            :role="embedded ? undefined : 'dialog'"
            :aria-modal="embedded ? undefined : 'true'"
            :aria-labelledby="embedded ? undefined : 'admin-product-preview-title'"
          >
            <div v-if="!embedded" class="admin-order-detail-dialog__head">
              <div>
                <p class="admin-panel__eyebrow">Product Preview</p>
                <h2 id="admin-product-preview-title">
                  {{ selectedAdminProductPreview ? selectedAdminProductPreview.name : 'Loading product...' }}
                </h2>
              </div>
              <button type="button" class="admin-confirm-dialog__ghost" @click="closeAdminProductPreview">Close</button>
            </div>
  
            <p v-if="isLoadingAdminProductPreview" class="admin-empty">Loading product details...</p>
  
            <template v-else-if="selectedAdminProductPreview">
              <section class="admin-product-preview-hero admin-product-preview-hero--summary">
                <div class="admin-product-preview-hero__content">
                  <div>
                    <span class="status" :class="selectedAdminProductPreview.status === 'active' ? 'status--completed' : 'status--pending'">
                      {{ formatLabel(selectedAdminProductPreview.status) }}
                    </span>
                    <h3>{{ selectedAdminProductPreview.name }}</h3>
                  </div>
                  <dl class="admin-product-preview-meta">
                    <div>
                      <dt>Gender</dt>
                      <dd>{{ selectedAdminProductPreview.departmentLabel || formatLabel(selectedAdminProductPreview.gender) || '-' }}</dd>
                    </div>
                    <div>
                      <dt>Product group</dt>
                      <dd>{{ selectedAdminProductPreview.productGroupLabel || selectedAdminProductPreview.productGroup || formatLabel(selectedAdminProductPreview.productGroupSlug) || '-' }}</dd>
                    </div>
                    <div>
                      <dt>Category</dt>
                      <dd>{{ selectedAdminProductPreview.categoryLabel || selectedAdminProductPreview.category || '-' }}</dd>
                    </div>
                    <div>
                      <dt>Collection</dt>
                      <dd>{{ selectedAdminProductPreview.collection || selectedAdminProductPreview.collectionSlug || 'No collection' }}</dd>
                    </div>
                    <div>
                      <dt>{{ previewTypeLabel(selectedAdminProductPreview) }}</dt>
                      <dd>{{ selectedAdminProductPreview.styleName || '-' }}</dd>
                    </div>
                    <div>
                      <dt>Slug</dt>
                      <dd>{{ selectedAdminProductPreview.slug || '-' }}</dd>
                    </div>
                  </dl>
                </div>
              </section>
  
              <section class="admin-product-preview-card admin-product-preview-card--description">
                <h3>Product Description</h3>
                <p>{{ selectedAdminProductPreview.description || 'No product description yet.' }}</p>
                <dl class="admin-product-preview-meta admin-product-preview-meta--details">
                  <div v-for="row in previewDetailRows(selectedAdminProductPreview)" :key="row.label">
                    <dt>{{ row.label }}</dt>
                    <dd>{{ row.value }}</dd>
                  </div>
                </dl>
              </section>

              <section class="admin-product-preview-card admin-product-preview-card--materials">
                <h3>Materials</h3>
                <div class="admin-product-preview-material-layout">
                  <div v-if="previewMaterialGroups(selectedAdminProductPreview).length" class="admin-product-preview-materials">
                    <section
                      v-for="group in previewMaterialGroups(selectedAdminProductPreview)"
                      :key="group.partName"
                      class="admin-product-preview-material-group"
                    >
                      <h4>{{ group.partName }}</h4>
                      <ul>
                        <li v-for="material in group.materials" :key="`${group.partName}-${material.name}-${material.percent}`">
                          {{ previewMaterialLine(material) }}
                        </li>
                      </ul>
                    </section>
                  </div>
                  <p v-else class="admin-empty admin-empty--compact">No materials configured yet.</p>
                  <dl
                    v-if="selectedAdminProductPreview.materialInformation && selectedAdminProductPreview.materialInformation.content"
                    class="admin-product-preview-meta admin-product-preview-meta--material-info"
                  >
                    <div>
                      <dt>{{ selectedAdminProductPreview.materialInformation.title || 'Additional material information' }}</dt>
                      <dd class="admin-product-preview-material-info">
                        {{ selectedAdminProductPreview.materialInformation.content }}
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>
  
              <section class="admin-product-preview-card admin-product-preview-card--variants">
                <h3>Color Variants</h3>
                <section
                  v-for="color in previewColorGroups(selectedAdminProductPreview)"
                  :key="color.key"
                  class="admin-product-preview-variant"
                >
                  <strong class="admin-product-preview-color-name">{{ color.name }}</strong>
                  <dl class="admin-product-preview-meta admin-product-preview-meta--variant">
                    <div>
                      <dt>Product code</dt>
                      <dd>{{ color.productCode || '-' }}</dd>
                    </div>
                    <div>
                      <dt>Color family</dt>
                      <dd>{{ color.family || '-' }}</dd>
                    </div>
                    <div>
                      <dt>Sizes</dt>
                      <dd>{{ previewColorSizes(color) }}</dd>
                    </div>
                     <div>
                      <dt>Original price</dt>
                      <dd>{{ formatCurrency(color.originalPrice) }}</dd>
                    </div>
                    <div>
                      <dt>Sale price</dt>
                      <dd>{{ hasPreviewPrice(color.salePrice) ? formatCurrency(color.salePrice) : 'No sale' }}</dd>
                    </div>
                    <div>
                      <dt>Total stock</dt>
                      <dd>{{ color.totalStock }}</dd>
                    </div>
                    <div>
                      <dt>Available</dt>
                      <dd>{{ color.availableStock }}</dd>
                    </div>
                    <div>
                      <dt>Reserved / Sold</dt>
                      <dd>{{ color.reservedStock }} / {{ color.soldUnits }}</dd>
                    </div>
                  </dl>
                  <div class="admin-product-preview-media-list">
                    <img
                      v-for="image in color.images"
                      :key="image.id || image.imageUrl"
                      :src="image.imageUrl"
                      :alt="image.altText || `${selectedAdminProductPreview.name} ${color.name}`"
                      loading="lazy"
                    />
                    <p v-if="!color.images.length" class="admin-empty">No media uploaded for this color.</p>
                  </div>
                </section>
                <p v-if="!previewColorGroups(selectedAdminProductPreview).length" class="admin-empty">No color variants configured yet.</p>
              </section>
  
            </template>
          </section>
        </div>
      </transition>
</template>

<script>
import { createAdminSectionProxy } from '../sections/adminSectionProxy';

const adminProductPreviewProxy = createAdminSectionProxy('AdminProductPreviewDialog');

export default {
  ...adminProductPreviewProxy,
  props: {
    embedded: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    hasPreviewPrice(value) {
      return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
    },
    previewProductGroupSlug(product) {
      return String(product && (product.productGroupSlug || product.product_group_slug || product.productGroup || product.product_group) || '').toLowerCase();
    },
    previewCategoryValue(product) {
      return String(product && (product.categorySlug || product.category_slug || product.category || product.categoryLabel || product.category_label) || '').toLowerCase();
    },
    previewTypeLabel(product) {
      const group = this.previewProductGroupSlug(product);

      if (group === 'shoes') return 'Footwear type';
      if (group === 'accessories') return 'Accessory type';
      return 'Style';
    },
    previewDetailRows(product) {
      const group = this.previewProductGroupSlug(product);
      const category = this.previewCategoryValue(product);
      const isPants = [
        'pants',
        'trouser',
        'jean',
        'shorts',
        'bottom',
        'legging',
        'jogger',
        'skirt'
      ].some(keyword => category.includes(keyword));
      const rows = [
        {
          label: 'Fit',
          value: product.fitName || product.fit_name || product.fit
        },
        {
          label: this.previewTypeLabel(product),
          value: product.styleName || product.style_name
        }
      ];

      if (group === 'clothing') {
        if (!isPants) {
          rows.push({
            label: 'Sleeve length',
            value: product.sleeveLength || product.sleeve_length
          });
        }

        rows.push({
          label: 'Length',
          value: product.garmentLength || product.garment_length || product.length
        });

        rows.push(isPants
          ? {
              label: 'Waist rise',
              value: product.waistRise || product.waist_rise
            }
          : {
              label: 'Neckline',
              value: product.neckline
            });
      }

      if (group === 'shoes') {
        rows.push({
          label: 'Heel height',
          value: product.heelHeight || product.heel_height
        });
      }

      return rows
        .map(row => ({
          ...row,
          value: String(row.value || '').trim()
        }))
        .filter(row => row.value);
    },
    previewMaterialGroups(product) {
      const source = Array.isArray(product && product.materials) ? product.materials : [];

      return source
        .map((groupOrMaterial, groupIndex) => {
          if (typeof groupOrMaterial === 'string') {
            return {
              partName: 'Main',
              materials: [{
                name: groupOrMaterial,
                percent: null
              }]
            };
          }

          if (Array.isArray(groupOrMaterial && groupOrMaterial.materials)) {
            return {
              partName: groupOrMaterial.partName || groupOrMaterial.part_name || `Part ${groupIndex + 1}`,
              materials: groupOrMaterial.materials
                .map(material => ({
                  name: material.name || material.materialName || material.material_name,
                  percent: material.percent ?? material.materialPercent ?? material.material_percent ?? null
                }))
                .filter(material => String(material.name || '').trim())
            };
          }

          return {
            partName: groupOrMaterial.partName || groupOrMaterial.part_name || 'Main',
            materials: [{
              name: groupOrMaterial.materialName || groupOrMaterial.material_name || groupOrMaterial.name,
              percent: groupOrMaterial.materialPercent ?? groupOrMaterial.material_percent ?? groupOrMaterial.percent ?? null
            }].filter(material => String(material.name || '').trim())
          };
        })
        .filter(group => group.materials.length);
    },
    previewMaterialLine(material) {
      const name = String(material && material.name || '').trim();
      const percent = material && material.percent;

      if (percent === null || percent === undefined || percent === '') {
        return name;
      }

      return `${name} ${Number(percent).toLocaleString()}%`;
    },
    previewColorSizes(color) {
      const sizes = Array.isArray(color && color.sizes) ? color.sizes : [];

      if (!sizes.length) {
        return 'No sizes configured';
      }

      return sizes.map(size => {
        const label = size.sizeLabel || size.size_label || 'One Size';
        const stock = Number(size.stockQuantity ?? size.stock_quantity ?? NaN);

        return Number.isFinite(stock) ? `${label} (${stock})` : label;
      }).join(', ');
    }
  }
};
</script>

<style scoped>
/* Admin dialog shell: CSS của lớp modal chung cho các dialog trong component này. */
.admin-confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 5000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(17, 17, 17, 0.36);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.admin-confirm-dialog {
  width: min(100%, 420px);
  padding: 28px;
  border: 1px solid rgba(17,17,17,0.10);
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 32px 90px rgba(17, 17, 17, 0.22);
  color: #111111;
  font-family: var(--font);
  display: grid;
  gap: 12px;
}

.admin-confirm-dialog h2,
.admin-confirm-dialog p {
  margin: 0;
}

.admin-confirm-dialog h2 {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.admin-confirm-dialog > p:not(.admin-panel__eyebrow) {
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: 14px;
}

.admin-confirm-dialog__field {
  display: grid;
  gap: 8px;
}

.admin-confirm-dialog__field span {
  color: var(--text-primary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.admin-confirm-dialog__field textarea {
  width: 100%;
  min-height: 96px;
  resize: vertical;
  padding: 12px;
  border: 1px solid var(--card-border);
  border-radius: var(--radius-sm);
  background: #ffffff;
  color: var(--text-primary);
  font-family: var(--font);
  line-height: 1.5;
  outline: none;
}

.admin-confirm-dialog__field textarea:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(168, 139, 114, 0.18);
}

.admin-product-preview-material-info {
  white-space: pre-wrap;
}

.admin-product-preview-materials {
  display: grid;
  gap: 10px;
}

.admin-product-preview-material-layout {
  display: grid;
  grid-template-columns: minmax(260px, 0.35fr) minmax(0, 0.65fr);
  align-items: start;
  gap: 18px;
}

.admin-product-preview-material-layout > .admin-empty {
  align-self: stretch;
  padding: 18px;
  border: 1px solid rgba(17,17,17,0.07);
  border-radius: 10px;
  background: #fafafa;
}

.admin-product-preview-material-group {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid rgba(17,17,17,0.07);
  border-radius: 10px;
  background: #fafafa;
}

.admin-product-preview-material-group h4,
.admin-product-preview-material-group ul {
  margin: 0;
}

.admin-product-preview-material-group h4 {
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.admin-product-preview-material-group ul {
  display: grid;
  gap: 4px;
  padding-left: 18px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.admin-confirm-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding-top: 4px;
  margin-top: 8px;
}

.admin-confirm-dialog__ghost,
.admin-confirm-dialog__danger {
  min-width: 140px;
  min-height: 44px;
  height: auto;
  padding: 0 18px;
  border-radius: 8px !important;
  font-family: var(--font);
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 220ms ease,
    border-color 220ms ease,
    color 220ms ease,
    transform 220ms ease;
}

.admin-confirm-dialog__ghost:disabled,
.admin-confirm-dialog__danger:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.admin-confirm-dialog__ghost {
  border: 1px solid var(--card-border);
  background: transparent;
  color: var(--text-primary);
}

.admin-confirm-dialog__ghost:hover:not(:disabled) {
  border-color: rgba(17, 17, 17, 0.22);
  background: rgba(17, 17, 17, 0.06);
  color: #111111;
  transform: translateY(-1px);
}

.admin-confirm-dialog__danger {
  border: 1px solid #111111;
  background: #111111;
  color: #ffffff;
}

.admin-confirm-dialog__danger:hover:not(:disabled) {
  border-color: #2f2f2f;
  background: #2f2f2f;
  transform: translateY(-1px);
}

.admin-confirm-enter-active,
.admin-confirm-leave-active {
  transition: opacity 180ms ease;
}

.admin-confirm-enter-from,
.admin-confirm-leave-to {
  opacity: 0;
}

/* AdminProductPreviewDialog: style preview sản phẩm nằm cùng component. */
.admin-product-preview-dialog {
  width: min(100%, 1100px);
  max-height: min(90vh, 880px);
  overflow: auto;
  display: grid;
  gap: 16px;
}

.admin-product-detail-embed {
  width: 100%;
  min-width: 0;
}

.admin-product-preview-dialog--page {
  width: 100%;
  max-height: none;
  overflow: visible;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
}

.admin-product-preview-dialog--page > .admin-empty,
.admin-product-preview-dialog--page > .admin-product-preview-hero,
.admin-product-preview-dialog--page > .admin-product-preview-card,
.admin-product-preview-dialog--page > .admin-product-preview-card--variants,
.admin-product-preview-dialog--page > .admin-product-preview-card--inventory {
  grid-column: 1;
}

.admin-product-preview-dialog--page .admin-product-preview-hero.admin-product-preview-hero--summary {
  grid-template-columns: minmax(0, 1fr);
}

.admin-product-preview-dialog--page .admin-product-preview-hero__content {
  padding: 32px;
}

.admin-product-preview-dialog--page .admin-product-preview-hero__content h3 {
  font-size: 30px;
}

.admin-product-preview-dialog--page .admin-product-preview-meta div {
  padding: 13px 16px;
}

.admin-product-preview-dialog--page .admin-product-preview-meta dt {
  font-size: 12px;
}

.admin-product-preview-dialog--page .admin-product-preview-meta dd {
  font-size: 14px;
}

.admin-product-preview-dialog--page .admin-product-preview-card {
  gap: 18px;
  padding: 26px;
}

.admin-product-preview-dialog--page .admin-product-preview-card h3 {
  font-size: 14px;
}

.admin-product-preview-dialog--page .admin-product-preview-card p,
.admin-product-preview-dialog--page .admin-product-preview-material-group ul {
  font-size: 14px;
}

.admin-product-preview-dialog--page .admin-product-preview-card--description > h3,
.admin-product-preview-dialog--page .admin-product-preview-card--description > p,
.admin-product-preview-dialog--page .admin-product-preview-card--description > .admin-product-preview-meta--details,
.admin-product-preview-dialog--page .admin-product-preview-card--materials > h3,
.admin-product-preview-dialog--page .admin-product-preview-card--materials > .admin-product-preview-material-layout {
  width: 100%;
  margin-right: 0;
  margin-left: 0;
}

.admin-product-preview-dialog--page .admin-product-preview-card--description > p {
  max-width: 1180px;
}

.admin-product-preview-dialog--page .admin-product-preview-meta--details {
  justify-content: start;
}

.admin-product-preview-dialog--page .admin-product-preview-color-name {
  font-size: 18px;
}

.admin-product-preview-dialog--page .admin-product-preview-media-list img {
  width: 132px;
  height: 168px;
  flex-basis: 132px;
}

.admin-order-detail-dialog__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(17,17,17,0.07);
  margin-bottom: 4px;
}

.admin-order-detail-dialog__head .admin-panel__eyebrow {
  font-size: 10px;
  color: var(--accent);
}

.admin-order-detail-dialog__head h2 {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 2px 0 0;
}

.admin-inventory-history-dialog__meta {
  display: inline-block;
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 700;
}

.admin-product-preview-hero {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 0;
  border: 1px solid var(--card-border);
  border-radius: 16px;
  background: #ffffff;
  overflow: hidden;
}

.admin-product-preview-hero--summary {
  grid-template-columns: minmax(0, 1fr);
}

.admin-product-preview-hero__media {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  min-height: 240px;
  overflow: hidden;
  background: var(--page-bg);
}

.admin-product-preview-hero__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.admin-product-preview-hero__media span {
  color: var(--text-secondary);
  font-size: 42px;
  font-weight: 800;
  opacity: 0.25;
}

.admin-product-preview-hero__content {
  display: grid;
  gap: 20px;
  padding: 24px;
  align-content: start;
}

.admin-product-preview-hero__content h3,
.admin-product-preview-hero__content p,
.admin-product-preview-card h3,
.admin-product-preview-card p {
  margin: 0;
}

.admin-product-preview-hero__content h3 {
  margin-top: 6px;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.admin-product-preview-hero__content p,
.admin-product-preview-card p {
  color: var(--text-secondary);
  font-size: 13.5px;
  line-height: 1.65;
}

.admin-product-preview-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  margin: 0;
  border: 1px solid rgba(17,17,17,0.07);
  border-radius: 12px;
  overflow: hidden;
}

.admin-product-preview-meta div {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  padding: 9px 13px;
  border-bottom: 1px solid rgba(17,17,17,0.06);
}

.admin-product-preview-meta div:nth-child(3n) {
  border-right: none;
}

.admin-product-preview-meta div:nth-last-child(-n+3) {
  border-bottom: none;
}

.admin-product-preview-meta--variant > div:nth-last-child(3) {
  border-bottom: 1px solid rgba(17,17,17,0.06);
}

.admin-product-preview-meta dt {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.admin-product-preview-meta dd {
  margin: 0;
  color: var(--text-primary);
  font-size: 12.5px;
  font-weight: 700;
  text-align: right;
  line-height: 1.4;
}

.admin-product-preview-swatch-cell {
  display: inline-flex;
  justify-content: flex-end;
  align-items: center;
  gap: 7px;
}

.admin-product-preview-swatch {
  width: 15px;
  height: 15px;
  flex: 0 0 15px;
  border: 1px solid rgba(17,17,17,0.18);
  border-radius: 999px;
}

.admin-product-preview-meta--details {
  grid-template-columns: repeat(auto-fit, minmax(150px, 210px));
  justify-content: start;
  gap: 10px;
  overflow: visible;
  border: 0;
  border-radius: 0;
}

.admin-product-preview-meta--details > div,
.admin-product-preview-meta--material-info > div {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: start;
  gap: 6px;
  min-height: 0;
}

.admin-product-preview-meta--details > div {
  padding: 12px 14px;
  border: 1px solid rgba(17,17,17,0.08) !important;
  border-radius: 8px;
  background: #fafafa;
}

.admin-product-preview-meta--details dt,
.admin-product-preview-meta--details dd,
.admin-product-preview-meta--material-info dt,
.admin-product-preview-meta--material-info dd {
  width: 100%;
  text-align: left;
}

.admin-product-preview-meta--details dd,
.admin-product-preview-meta--material-info dd {
  overflow-wrap: anywhere;
}

.admin-product-preview-meta--material-info {
  grid-template-columns: minmax(0, 1fr);
}

.admin-product-preview-meta--material-info > div {
  padding: 16px 18px;
  border-bottom: 0;
}

.admin-product-preview-card {
  display: grid;
  gap: 14px;
  padding: 20px;
  border: 1px solid var(--card-border);
  border-radius: 14px;
  background: #ffffff;
}

.admin-product-preview-card h3 {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.admin-product-preview-color-name {
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
}

.admin-product-preview-variant {
  display: grid;
  gap: 14px;
  padding-top: 20px;
  border-top: 1px solid rgba(17,17,17,0.08);
}

.admin-product-preview-card--variants > .admin-product-preview-variant:first-of-type {
  padding-top: 0;
  border-top: 0;
}

.admin-product-preview-media-list {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-height: 100px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.admin-product-preview-media-list img {
  width: 90px;
  height: 112px;
  flex: 0 0 90px;
  border-radius: 10px;
  object-fit: cover;
  background: var(--page-bg);
  border: 1px solid rgba(17,17,17,0.06);
  transition: opacity 0.15s ease;
}
.admin-product-preview-media-list img:hover { opacity: 0.82; }

/* Admin dialog shared pieces: table/status/action styles used inside this dialog. */
.admin-empty {
  margin: 0;
  padding: 24px 0;
  color: var(--text-tertiary);
  font-size: 13.5px;
  text-align: center;
}

.admin-empty--compact {
  padding: 8px 0;
  text-align: left;
}

.dashboard-table {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow-x: auto;
  border-radius: var(--radius-md);
  border: 1px solid var(--card-border);
}

.dashboard-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  line-height: 1.35;
}

.dashboard-table thead tr {
  background: #f8fafa;
  border-bottom: 1px solid var(--card-border);
}

.dashboard-table th {
  padding: 13px 16px;
  text-align: left;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text-tertiary);
  line-height: 1.25;
  white-space: nowrap;
}

.dashboard-table td {
  padding: 14px 16px;
  vertical-align: middle;
  color: var(--text-primary);
  font-size: inherit;
  line-height: inherit;
  border-bottom: 1px solid rgba(13,59,56,0.05);
}

.dashboard-table tbody tr:last-child td {
  border-bottom: none;
}

.dashboard-table tbody tr {
  transition: background 0.12s;
}

.dashboard-table tbody tr:hover {
  background: rgba(26,158,143,0.04);
}

.table-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 12px;
  border: 1px solid rgba(168, 139, 114, 0.18);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.85);
  color: #6b5643;
  font-family: var(--font);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.table-action:hover {
  border-color: #a88b72;
  background: rgba(168, 139, 114, 0.08);
  color: #7c634f;
}

.table-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.table-action--order-primary {
  border-color: #a88b72;
  background: #a88b72;
  color: #ffffff;
}

.table-action--order-primary:hover:not(:disabled) {
  border-color: #987c64;
  background: #987c64;
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(168, 139, 114, 0.28);
}

.table-action--danger {
  color: #a53f3f;
  border-color: rgba(165, 63, 63, 0.18);
  background: rgba(165, 63, 63, 0.06);
}

.table-action--danger:hover {
  background: #a53f3f;
  border-color: #a53f3f;
  color: #ffffff;
}

.table-status-note {
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.35;
}

.table-status-note--action {
  max-width: 150px;
}

.status {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 9px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.status--pending {
  background: #fef3c7;
  color: #92400e;
}

.status--processing {
  background: #dbeafe;
  color: #1e40af;
}

.status--completed {
  background: #d1fae5;
  color: #065f46;
}

.status--danger {
  background: #fee2e2;
  color: #991b1b;
}

.stock-change {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.stock-change--positive {
  background: #d1fae5;
  color: #065f46;
}

.stock-change--negative {
  background: #fee2e2;
  color: #991b1b;
}

@media (max-width: 900px) {
  .admin-product-preview-dialog--page {
    grid-template-columns: 1fr;
  }

  .admin-product-preview-dialog--page > .admin-product-preview-card {
    grid-column: 1;
  }

  .admin-product-preview-dialog--page .admin-product-preview-hero {
    grid-template-columns: minmax(220px, 0.8fr) minmax(0, 1.2fr);
  }

  .admin-product-preview-meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .admin-product-preview-meta div:nth-last-child(-n+3) {
    border-bottom: 1px solid rgba(17,17,17,0.06);
  }

  .admin-product-preview-meta div:nth-last-child(-n+2) {
    border-bottom: none;
  }

  .admin-product-preview-material-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .admin-confirm-backdrop {
    padding: 12px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-hero {
    grid-template-columns: 1fr;
  }

  .admin-product-preview-dialog--page .admin-product-preview-hero__media {
    min-height: 360px;
    aspect-ratio: 4 / 5;
  }

  .admin-product-preview-dialog--page .admin-product-preview-hero__content {
    padding: 22px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-hero__content h3 {
    font-size: 25px;
  }

  .admin-product-preview-meta {
    grid-template-columns: 1fr;
  }

  .admin-product-preview-meta div,
  .admin-product-preview-meta div:nth-last-child(-n+2) {
    border-bottom: 1px solid rgba(17,17,17,0.06);
  }

  .admin-product-preview-meta div:last-child {
    border-bottom: none;
  }
}

@media (min-width: 1440px) {
  .admin-product-preview-dialog--page {
    gap: 24px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-hero {
    grid-template-columns: minmax(360px, 0.75fr) minmax(0, 1.8fr);
  }

  .admin-product-preview-dialog--page .admin-product-preview-hero__media {
    min-height: 520px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-meta dt {
    font-size: 13px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-meta dd,
  .admin-product-preview-dialog--page .admin-product-preview-card p,
  .admin-product-preview-dialog--page .admin-product-preview-material-group ul {
    font-size: 15px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-card h3 {
    font-size: 15px;
  }

  .dashboard-table table {
    font-size: 15px;
  }

  .dashboard-table th {
    font-size: 13px;
  }

  .dashboard-table td {
    padding: 18px 20px;
  }

  .table-action {
    height: 36px;
    padding: 0 14px;
    font-size: 13px;
  }

  .status,
  .stock-change {
    min-height: 26px;
    height: 26px;
    padding: 0 10px;
    font-size: 12px;
  }
}

@media (min-width: 1920px) {
  .admin-product-preview-dialog--page {
    gap: 28px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-hero {
    grid-template-columns: minmax(430px, 0.8fr) minmax(0, 1.8fr);
  }

  .admin-product-preview-dialog--page .admin-product-preview-hero__media {
    min-height: 620px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-hero__content {
    padding: 40px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-hero__content h3 {
    font-size: 38px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-meta div {
    padding: 16px 19px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-meta dt {
    font-size: 15px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-meta dd,
  .admin-product-preview-dialog--page .admin-product-preview-card p,
  .admin-product-preview-dialog--page .admin-product-preview-material-group ul {
    font-size: 17px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-card {
    padding: 32px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-card h3 {
    font-size: 17px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-color-name {
    font-size: 21px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-media-list img {
    width: 158px;
    height: 200px;
    flex-basis: 158px;
  }

  .dashboard-table table {
    font-size: 16px;
  }

  .dashboard-table th {
    font-size: 14px;
  }

  .dashboard-table td {
    padding: 20px 24px;
  }

  .table-action {
    height: 38px;
    padding: 0 16px;
    font-size: 14px;
  }

  .status,
  .stock-change {
    min-height: 28px;
    height: 28px;
    padding: 0 11px;
    font-size: 13px;
  }
}

@media (min-width: 2560px) {
  .admin-product-preview-dialog--page {
    gap: 34px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-hero {
    grid-template-columns: minmax(520px, 0.85fr) minmax(0, 1.8fr);
  }

  .admin-product-preview-dialog--page .admin-product-preview-hero__media {
    min-height: 740px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-hero__content {
    padding: 48px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-hero__content h3 {
    font-size: 46px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-meta div {
    padding: 19px 23px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-meta dt {
    font-size: 18px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-meta dd,
  .admin-product-preview-dialog--page .admin-product-preview-card p,
  .admin-product-preview-dialog--page .admin-product-preview-material-group ul {
    font-size: 20px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-card {
    padding: 38px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-card h3 {
    font-size: 20px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-color-name {
    font-size: 24px;
  }

  .admin-product-preview-dialog--page .admin-product-preview-media-list img {
    width: 190px;
    height: 240px;
    flex-basis: 190px;
  }
}

</style>
