<template>
  <section class="studio-form__section">
    <div class="studio-form__section-head">
      <div>
        <span>Basic information</span>
      </div>
    </div>

    <div class="studio-form__grid">
      <label>
        <span>Gender / Department</span>
        <select :value="form.gender" @change="updateField('gender', $event.target.value)">
          <option value="women">Women</option>
          <option value="men">Men</option>
        </select>
      </label>

      <label>
        <span>Product name</span>
        <input
          :value="form.name"
          type="text"
          placeholder="Regular-Fit Cotton Polo Shirt"
          required
          :aria-invalid="!form.name.trim() && errorMessage ? 'true' : 'false'"
          :aria-describedby="errorMessage ? 'product-form-error' : null"
          @input="updateField('name', $event.target.value)"
        />
      </label>

      <label>
        <span>Slug</span>
        <input :value="form.slug" type="text" placeholder="regular-fit-cotton-polo-shirt" @input="updateField('slug', $event.target.value)" />
      </label>

      <label>
        <span>Product group</span>
        <select :value="form.productGroup" @change="updateField('productGroup', $event.target.value)">
          <option v-for="option in productGroupOptions" :key="option.id || option.name" :value="option.name">
            {{ option.label }}
          </option>
        </select>
      </label>

      <label>
        <span>Category</span>
        <select :value="form.category" @change="updateField('category', $event.target.value)">
          <option v-for="option in categoryOptions" :key="option.id || option.name" :value="option.name">
            {{ option.label }}
          </option>
        </select>
      </label>

      <label>
        <span>Collection</span>
        <select v-if="collectionOptions.length" :value="form.collection" @change="updateField('collection', $event.target.value)">
          <option value="">No collection</option>
          <option v-for="option in collectionOptions" :key="option.slug || option.id" :value="option.slug || option.name">
            {{ option.name }}
          </option>
        </select>
        <input v-else :value="form.collection" type="text" placeholder="modern-basics" @input="updateField('collection', $event.target.value)" />
      </label>

      <label>
        <span>{{ styleFieldLabel }}</span>
        <input
          :value="form.style"
          type="text"
          :list="styleDatalistId"
          :placeholder="stylePlaceholder"
          @input="updateField('style', $event.target.value)"
        />
        <datalist :id="styleDatalistId">
          <option v-for="option in styleOptions" :key="option.id || option.slug" :value="option.name"></option>
        </datalist>
      </label>

      <label v-if="productGroupSlug === 'shoes'">
        <span>Heel height</span>
        <select :value="form.heelHeight" required @change="updateField('heelHeight', $event.target.value)">
          <option value="" disabled>Select heel height</option>
          <option v-for="option in heelHeightOptions" :key="option" :value="option">{{ option }}</option>
        </select>
      </label>

      <label>
        <span>Status</span>
        <select :value="form.status" @change="updateField('status', $event.target.value)">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </label>
    </div>

  </section>
</template>

<script>
export default {
  name: 'ProductBasicFields',
  props: {
    form: {
      type: Object,
      required: true
    },
    categoryOptions: {
      type: Array,
      default: () => []
    },
    productGroupOptions: {
      type: Array,
      default: () => []
    },
    collectionOptions: {
      type: Array,
      default: () => []
    },
    styleOptions: {
      type: Array,
      default: () => []
    },
    productGroupSlug: {
      type: String,
      default: 'clothing'
    },
    heelHeightOptions: {
      type: Array,
      default: () => []
    },
    errorMessage: {
      type: String,
      default: ''
    }
  },
  emits: ['update-field'],
  computed: {
    styleFieldLabel() {
      if (this.productGroupSlug === 'shoes') return 'Footwear type';
      if (this.productGroupSlug === 'accessories') return 'Accessory type';
      return 'Style';
    },
    stylePlaceholder() {
      if (this.productGroupSlug === 'shoes') return 'Select or type footwear type';
      if (this.productGroupSlug === 'accessories') return 'Select or type accessory type';
      return 'Select or type style';
    },
    styleDatalistId() {
      return `product-style-options-${this.productGroupSlug || 'all'}`;
    }
  },
  methods: {
    updateField(field, value) {
      this.$emit('update-field', {
        field,
        value
      });
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

.studio-form__section-head {
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

</style>
