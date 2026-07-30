<template>
  <section class="studio-form__section">
    <div class="studio-form__section-head">
      <div>
        <span>Pricing</span>
      </div>
    </div>

    <div class="studio-form__grid">
      <label>
        <span>Pricing mode</span>
        <select :value="form.pricingMode" @change="updateField('pricingMode', $event.target.value)">
          <option value="regular">Regular</option>
          <option value="sale">Sale</option>
        </select>
      </label>

      <label>
        <span>Original price</span>
        <input :value="form.originalPrice" type="number" min="0" step="1000" required @input="updateNumberField('originalPrice', $event.target.value)" />
      </label>

      <label v-if="form.pricingMode === 'sale'">
        <span>Sale price</span>
        <input :value="form.salePrice" type="number" min="0" step="1000" required @input="updateNumberField('salePrice', $event.target.value)" />
      </label>

    </div>
  </section>
</template>

<script>
export default {
  name: 'ProductPricingFields',
  props: {
    form: {
      type: Object,
      required: true
    }
  },
  emits: ['update-field'],
  methods: {
    updateField(field, value) {
      this.$emit('update-field', {
        field,
        value
      });
    },
    updateNumberField(field, value) {
      this.updateField(field, value === '' ? '' : Number(value));
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
