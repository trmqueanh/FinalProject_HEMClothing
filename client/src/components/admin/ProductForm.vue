<template>
  <form class="studio-form product-form shell-card" @submit.prevent="onSubmit" @wheel.capture="preventNumberInputWheel">
    <div class="page-intro page-intro--compact">
      <h2>{{ heading }}</h2>
    </div>

    <p v-if="errorMessage" id="product-form-error" class="studio-form__error field-error" role="alert">
      {{ errorMessage }}
    </p>

    <ProductBasicFields
      :form="form"
      :product-group-options="productGroupOptions"
      :category-options="categoryOptions"
      :collection-options="filteredCollectionOptions"
      :style-options="filteredStyleOptions"
      :product-group-slug="selectedProductGroupSlug"
      :heel-height-options="heelHeightOptions"
      :error-message="errorMessage"
      @update-field="updateFormField"
    />

    <ProductPricingFields :form="form" @update-field="updateFormField" />

    <ProductDescriptionFields
      :form="form"
      :error-message="errorMessage"
      :product-group-slug="selectedProductGroupSlug"
      :is-pants-category="isPantsClothingCategory"
      :fit-options="filteredFitOptions"
      :material-options="filteredMaterialOptions"
      :material-part-options="materialPartOptions"
      @update-field="updateFormField"
      @add-material-row="addMaterialRow"
      @remove-material-row="removeMaterialRow"
      @update-material-row="updateMaterialRow"
    />

    <ColorVariantEditor
      :form="form"
      :common-size-options="commonSizeOptions"
      :is-size-selected="isSizeSelected"
      :product-group-slug="selectedProductGroupSlug"
      @add-color="addColorVariant"
      @remove-color="removeColorVariant"
      @sync-color-image-names="syncColorImageNames"
      @update-color-family="updateColorFamily"
      @update-color-hex="updateColorHex"
      @update-color-price="updateColorPrice"
      @update-product-code="updateProductCode"
      @upload-images="handleColorImageFiles"
      @set-primary-image="setPrimaryImage"
      @remove-image="removeColorImage"
      @add-size-option="addSizeFromOption"
      @add-custom-size="addCustomSize"
      @update-custom-size="updateCustomSizeInput"
      @remove-size="removeSize"
      @update-accessory-stock="updateAccessoryStock"
    />

    <div class="studio-form__actions">
      <button type="submit" class="primary-button" :disabled="isSubmitting">
        {{ isSubmitting ? 'Saving...' : submitLabel }}
      </button>
    </div>
  </form>
</template>

<script>
import { productFormMethods } from './product-form/productFormMethods';
import {
  CLOTHING_SIZE_OPTIONS,
  HEEL_HEIGHT_OPTIONS,
  MATERIAL_PART_OPTIONS,
  SHOE_SIZE_OPTIONS,
  flattenCategoryOptions,
  isPantsCategoryValue
} from './product-form/productFormConfig';
import ColorVariantEditor from './ColorVariantEditor.vue';
import ProductBasicFields from './ProductBasicFields.vue';
import ProductDescriptionFields from './ProductDescriptionFields.vue';
import ProductPricingFields from './ProductPricingFields.vue';
import { sortSizeLabels } from '../../helpers/sizes';

const normalizeOptionIdentity = value => String(value || '').trim().toLowerCase();

export default {
  name: 'ProductForm',
  components: {
    ColorVariantEditor,
    ProductBasicFields,
    ProductDescriptionFields,
    ProductPricingFields
  },
  props: {
    product: {
      type: Object,
      default() {
        return {};
      }
    },
    submitLabel: {
      type: String,
      default: 'Save product'
    },
    isSubmitting: {
      type: Boolean,
      default: false
    },
    heading: {
      type: String,
      default: 'Product editor'
    }
  },
  data() {
    return {
      departments: [],
      productGroups: [],
      adminCategoryOptions: [],
      collectionOptions: [],
      styleOptions: [],
      fitOptions: [],
      materialOptions: [],
      form: this.buildForm(this.product),
      hasLoadedProductReferences: false,
      errorMessage: ''
    };
  },
  computed: {
    commonSizeOptions() {
      if (this.selectedProductGroupSlug === 'accessories') {
        return [];
      }

      return sortSizeLabels(this.selectedProductGroupSlug === 'shoes'
        ? SHOE_SIZE_OPTIONS
        : CLOTHING_SIZE_OPTIONS);
    },
    heelHeightOptions() {
      return HEEL_HEIGHT_OPTIONS;
    },
    materialPartOptions() {
      return MATERIAL_PART_OPTIONS;
    },
    selectedProductGroupSlug() {
      return normalizeOptionIdentity(this.form.productGroup);
    },
    filteredCollectionOptions() {
      const department = normalizeOptionIdentity(this.form.gender);

      return this.collectionOptions.filter(collection => {
        const availableDepartments = Array.isArray(collection.availableDepartments)
          ? collection.availableDepartments.map(normalizeOptionIdentity)
          : [];
        const departmentConfigs = Array.isArray(collection.departments) ? collection.departments : [];

        if (availableDepartments.length) {
          return availableDepartments.includes(department);
        }

        if (departmentConfigs.length) {
          return departmentConfigs.some(config =>
            normalizeOptionIdentity(config.departmentName) === department &&
            normalizeOptionIdentity(config.status || 'active') === 'active'
          );
        }

        return false;
      });
    },
    selectedCategoryOption() {
      return this.categoryOptions.find(option => option.name === this.form.category) || null;
    },
    isPantsClothingCategory() {
      if (this.selectedProductGroupSlug !== 'clothing') {
        return false;
      }

      const categoryValues = [
        this.form.category,
        this.selectedCategoryOption && this.selectedCategoryOption.name,
        this.selectedCategoryOption && this.selectedCategoryOption.slug,
        this.selectedCategoryOption && this.selectedCategoryOption.label
      ];

      return categoryValues.some(isPantsCategoryValue);
    },
    filteredStyleOptions() {
      const group = this.selectedProductGroupSlug;
      const department = normalizeOptionIdentity(this.form.gender);
      const categoryId = String(this.selectedCategoryOption && this.selectedCategoryOption.id || '');
      const categorySlug = normalizeOptionIdentity(this.selectedCategoryOption && this.selectedCategoryOption.name);
      const scoped = this.styleOptions.filter(option => {
        const optionGroup = normalizeOptionIdentity(option.productGroupSlug);
        const optionDepartment = normalizeOptionIdentity(option.departmentName);
        return (!optionGroup || optionGroup === group) && (!optionDepartment || optionDepartment === department);
      });

      if (group !== 'clothing') {
        return scoped;
      }

      const categorySpecific = scoped.filter(option =>
        (categoryId && String(option.categoryId || '') === categoryId) ||
        (categorySlug && normalizeOptionIdentity(option.categorySlug) === categorySlug)
      );

      return categorySpecific.length
        ? categorySpecific
        : scoped.filter(option => !option.categoryId && !option.categorySlug);
    },
    filteredFitOptions() {
      if (this.selectedProductGroupSlug !== 'clothing') {
        return [];
      }

      const department = normalizeOptionIdentity(this.form.gender);
      return this.fitOptions.filter(option => {
        const optionGroup = normalizeOptionIdentity(option.productGroupSlug);
        const optionDepartment = normalizeOptionIdentity(option.departmentName);
        return (!optionGroup || optionGroup === 'clothing') && (!optionDepartment || optionDepartment === department);
      });
    },
    filteredMaterialOptions() {
      const group = this.selectedProductGroupSlug;
      const department = normalizeOptionIdentity(this.form.gender);

      return this.materialOptions.filter(option => {
        const optionGroup = normalizeOptionIdentity(option.productGroupSlug);
        const optionDepartment = normalizeOptionIdentity(option.departmentName);
        return (!optionGroup || optionGroup === group) && (!optionDepartment || optionDepartment === department);
      });
    },
    categoryOptions() {
      if (this.adminCategoryOptions.length) {
        const selectedGender = normalizeOptionIdentity(this.form.gender);
        const selectedGroup = normalizeOptionIdentity(this.form.productGroup);
        const categories = this.adminCategoryOptions.filter(category => {
          const department = normalizeOptionIdentity(category.departmentName || category.department || category.gender);
          const groupValues = [
            category.productGroupSlug,
            category.productGroup,
            category.productGroupLabel
          ].map(normalizeOptionIdentity);

          return department === selectedGender && (!selectedGroup || groupValues.includes(selectedGroup));
        });

        return flattenCategoryOptions(categories);
      }

      const department = this.departments.find(item => item.name === this.form.gender);
      const groups = department && Array.isArray(department.groups) ? department.groups : [];
      const selectedGroup = groups.find(group =>
        [group.slug, group.name, group.label].map(value => String(value || '')).includes(this.form.productGroup)
      );
      const categories = selectedGroup && Array.isArray(selectedGroup.categories)
        ? selectedGroup.categories
        : department && Array.isArray(department.categories)
          ? department.categories
          : [];

      return categories.length
        ? flattenCategoryOptions(categories)
        : [
            { name: 'tops', label: 'Tops' },
            { name: 'bottoms', label: 'Bottoms' },
            { name: 'dresses', label: 'Dresses' },
            { name: 'outerwear', label: 'Outerwear' },
            { name: 'knitwear', label: 'Knitwear' }
          ];
    },
    productGroupOptions() {
      if (this.productGroups.length) {
        return this.productGroups.map(group => ({
          id: group.id,
          name: group.slug || group.name,
          label: group.label || group.name
        }));
      }

      const department = this.departments.find(item => item.name === this.form.gender);
      const groups = department && Array.isArray(department.groups) ? department.groups : [];

      return groups.length
        ? groups.map(group => ({
            id: group.id,
            name: group.slug || group.name,
            label: group.label || group.name
          }))
        : [
            { name: 'clothing', label: 'Clothing' },
            { name: 'shoes', label: 'Shoes' },
            { name: 'accessories', label: 'Accessories' }
          ];
    }
  },
  watch: {
    product: {
      deep: true,
      handler(nextValue) {
        this.revokePreviewUrls();
        this.form = this.buildForm(nextValue);
        if (this.hasLoadedProductReferences) {
          this.syncProductGroupWithOptions({ allowFallback: true });
          this.syncCategoryWithOptions({ allowFallback: true });
        }
        this.refreshAutoProductCodes();
      }
    },
    'form.gender'() {
      if (this.hasLoadedProductReferences) {
        this.syncProductGroupWithOptions({ allowFallback: true });
        this.syncCategoryWithOptions({ allowFallback: true });
      }

      this.normalizeScopedSelections();
      if (
        this.form.collection &&
        !this.filteredCollectionOptions.some(collection =>
          [collection.slug, collection.name].map(normalizeOptionIdentity).includes(normalizeOptionIdentity(this.form.collection))
        )
      ) {
        this.form.collection = '';
      }
      this.refreshAutoProductCodes();
    },
    'form.productGroup'() {
      if (this.hasLoadedProductReferences) {
        this.syncCategoryWithOptions({ allowFallback: true });
      }

      this.normalizeScopedSelections();
      this.refreshAutoProductCodes();
    },
    'form.category'() {
      this.normalizeScopedSelections();
      this.refreshAutoProductCodes();
    },
    'form.pricingMode'(nextMode, previousMode) {
      if (previousMode === 'regular') {
        this.form.originalPrice = Number(this.form.originalPrice || this.form.price || 0);
      }

      if (nextMode === 'regular') {
        this.form.price = Number(this.form.originalPrice || this.form.price || 0);
        this.form.salePrice = null;
      }
    }
  },
  beforeUnmount() {
    this.revokePreviewUrls();
  },
  methods: productFormMethods,
  mounted() {
    this.loadDepartments();
  }
};
</script>

<style scoped>
.studio-form {
  --card-bg: #ffffff;
  --card-border: rgba(15,22,35,0.08);
  --input-border: rgba(15,22,35,0.14);
  --input-border-focus: #a88b72;
  --text-primary: #0f1623;
  --text-secondary: #5a6478;
  --radius: 10px;
  --radius-lg: 14px;
  --space-1: 8px;
  --space-2: 12px;
  --space-3: 16px;
  --font-size-sm: 14px;
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-bg-surface-alt: rgba(255, 255, 255, 0.74);
  --color-border-default: var(--card-border);

  display: grid;
  gap: var(--space-3);
  padding: 28px;
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  background: var(--card-bg);
  box-shadow: 0 1px 3px rgba(15,22,35,0.04), 0 8px 24px rgba(15,22,35,0.05);
  color: var(--color-text-primary);
  font-family: inherit;
}

/* ProductForm owns the shared form controls used by its child field components. */
:deep(.studio-form__section),
:deep(.studio-form__color-card),
:deep(form) {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  padding: 20px 22px;
  box-shadow: 0 1px 3px rgba(15,22,35,0.04), 0 8px 24px rgba(15,22,35,0.05);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

:deep(.studio-form__section:hover),
:deep(.studio-form__color-card:hover) {
  border-color: rgba(15,22,35,0.12);
  box-shadow: 0 2px 6px rgba(15,22,35,0.05), 0 10px 28px rgba(15,22,35,0.07);
}

:deep(label) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.01em;
}

:deep(input),
:deep(select),
:deep(textarea) {
  width: 100%;
  box-sizing: border-box;
  background: #fbfbfa;
  border: 1.5px solid var(--input-border) !important;
  border-radius: var(--radius) !important;
  padding: 10px 14px !important;
  min-height: 44px;
  font-size: 14.5px;
  line-height: 1.4;
  font-family: inherit;
  color: var(--text-primary);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

:deep(textarea) {
  min-height: 100px;
  padding-top: 12px;
  line-height: 1.55;
  resize: vertical;
}

:deep(input::placeholder),
:deep(textarea::placeholder) {
  color: rgba(15, 22, 35, 0.38);
}

:deep(input:hover:not(:disabled)),
:deep(select:hover:not(:disabled)),
:deep(textarea:hover:not(:disabled)) {
  border-color: rgba(15, 22, 35, 0.26) !important;
  background: #ffffff;
}

:deep(input:focus),
:deep(select:focus),
:deep(textarea:focus) {
  outline: none;
  border-color: var(--input-border-focus) !important;
  box-shadow: 0 0 0 3.5px rgba(168, 139, 114, 0.18) !important;
  background: #ffffff;
}

:deep(input:disabled),
:deep(select:disabled),
:deep(textarea:disabled) {
  background: rgba(15, 22, 35, 0.04);
  color: rgba(15, 22, 35, 0.42);
  border-color: var(--card-border) !important;
  cursor: not-allowed;
}

:deep(select) {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  cursor: pointer;
  padding-right: 38px !important;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%235a6478' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
}

:deep(input[type="checkbox"]),
:deep(input[type="radio"]) {
  width: 17px;
  height: 17px;
  min-height: auto;
  padding: 0 !important;
  accent-color: var(--input-border-focus);
  cursor: pointer;
}

:deep(input[type="number"]) {
  font-variant-numeric: tabular-nums;
}

.page-intro {
  display: grid;
  gap: var(--space-2);
  max-width: 680px;
}

.page-intro--compact {
  gap: 6px;
}

.page-intro h2 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: clamp(22px, 2.7vw, 30px);
  font-weight: 700;
  line-height: 1.02;
  letter-spacing: -0.03em;
}

.studio-form__error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 11px 16px;
  border-radius: 10px;
  background: rgba(180, 35, 24, 0.06);
  border: 1px solid rgba(180, 35, 24, 0.22);
  color: #b42318;
  font-size: 13.5px;
  font-weight: 500;
}

.studio-form__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 4px;
}

.primary-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: #a88b72 !important;
  color: #fff !important;
  border: none !important;
  border-radius: 10px !important;
  padding: 0 22px !important;
  height: 42px !important;
  font-size: 13.5px !important;
  font-weight: 700 !important;
  letter-spacing: 0.01em;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
  box-shadow: 0 1px 3px rgba(168, 139, 114, 0.30), 0 4px 12px rgba(168, 139, 114, 0.20);
}

.primary-button:hover {
  background: #987c64 !important;
  box-shadow: 0 2px 6px rgba(168, 139, 114, 0.34), 0 6px 16px rgba(168, 139, 114, 0.22);
  transform: translateY(-1px);
}

.primary-button:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(168, 139, 114, 0.22);
}

:deep(button[type="button"]),
:deep(.btn-secondary) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent !important;
  color: var(--text-secondary) !important;
  border: 1px solid var(--card-border) !important;
  border-radius: var(--radius) !important;
  padding: 0 16px !important;
  height: 38px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

:deep(button[type="button"]:hover),
:deep(.btn-secondary:hover) {
  background: var(--page-bg, #ffffff) !important;
  border-color: var(--input-border) !important;
  color: var(--text-primary) !important;
}

:deep(.text-button--danger) {
  background: rgba(180,35,24,0.04) !important;
  border: 1px solid rgba(180,35,24,0.22) !important;
  color: #b42318 !important;
  border-radius: 6px !important;
  padding: 4px 9px !important;
  height: auto !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  text-decoration: none !important;
}

:deep(button[type="button"].text-button--danger:not(:disabled):hover) {
  background: #b42318 !important;
  border-color: #b42318 !important;
  color: #fff !important;
}

@media (min-width: 1440px) {
  .studio-form {
    --font-size-sm: 15px;
    gap: 20px;
    padding: 32px;
  }

  :deep(.studio-form__section),
  :deep(.studio-form__color-card),
  :deep(form) {
    padding: 24px 26px;
  }

  :deep(label) {
    font-size: 14px;
  }

  :deep(input),
  :deep(select),
  :deep(textarea) {
    min-height: 48px;
    font-size: 15.5px;
  }

  .page-intro h2 {
    font-size: 32px;
  }

  .studio-form__error,
  .primary-button,
  :deep(button[type="button"]),
  :deep(.btn-secondary) {
    font-size: 14.5px !important;
  }

  .primary-button {
    height: 46px !important;
  }
}

@media (min-width: 1920px) {
  .studio-form {
    --font-size-sm: 17px;
    gap: 24px;
    padding: 38px;
  }

  :deep(.studio-form__section),
  :deep(.studio-form__color-card),
  :deep(form) {
    padding: 30px 32px;
  }

  :deep(label) {
    margin-bottom: 8px;
    font-size: 16px;
  }

  :deep(input),
  :deep(select),
  :deep(textarea) {
    min-height: 54px;
    padding-right: 17px !important;
    padding-left: 17px !important;
    font-size: 17.5px;
  }

  .page-intro h2 {
    font-size: 37px;
  }

  .studio-form__error,
  .primary-button,
  :deep(button[type="button"]),
  :deep(.btn-secondary) {
    font-size: 16px !important;
  }

  .primary-button {
    height: 50px !important;
    padding-right: 26px !important;
    padding-left: 26px !important;
  }

  :deep(button[type="button"]),
  :deep(.btn-secondary) {
    height: 46px !important;
  }
}

@media (min-width: 2560px) {
  .studio-form {
    --font-size-sm: 19px;
    gap: 30px;
    padding: 46px;
  }

  :deep(.studio-form__section),
  :deep(.studio-form__color-card),
  :deep(form) {
    padding: 36px 40px;
  }

  :deep(label) {
    margin-bottom: 10px;
    font-size: 18px;
  }

  :deep(input),
  :deep(select),
  :deep(textarea) {
    min-height: 62px;
    font-size: 20px;
  }

  .page-intro h2 {
    font-size: 44px;
  }

  .studio-form__error,
  .primary-button,
  :deep(button[type="button"]),
  :deep(.btn-secondary) {
    font-size: 18px !important;
  }

  .primary-button {
    height: 58px !important;
    padding-right: 32px !important;
    padding-left: 32px !important;
  }

  :deep(button[type="button"]),
  :deep(.btn-secondary) {
    height: 52px !important;
  }
}

</style>
