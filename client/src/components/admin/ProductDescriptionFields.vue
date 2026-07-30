<template>
  <section class="studio-form__section">
    <div class="studio-form__section-head">
      <div>
        <span>Product description</span>
      </div>
    </div>

    <label class="studio-form__block">
      <span>Description</span>
      <textarea
        :value="form.description"
        rows="4"
        placeholder="Describe fit, texture, and styling direction."
        required
        :aria-invalid="!form.description.trim() && errorMessage ? 'true' : 'false'"
        :aria-describedby="errorMessage ? 'product-form-error' : null"
        @input="updateField('description', $event.target.value)"
        @keydown.enter.stop
      ></textarea>
    </label>

    <div class="studio-form__grid">
      <label v-if="productGroupSlug === 'clothing'">
        <span>Fit</span>
        <select :value="form.fit" @change="updateField('fit', $event.target.value)">
          <option value="">No fit</option>
          <option v-for="option in fitOptions" :key="option.id || option.slug" :value="option.name">
            {{ option.name }}
          </option>
        </select>
      </label>

      <template v-if="productGroupSlug === 'clothing'">
        <label v-if="!isPantsCategory">
          <span>Sleeve length</span>
          <input
            :value="form.sleeveLength"
            type="text"
            placeholder="Short sleeve"
            @input="updateField('sleeveLength', $event.target.value)"
          />
        </label>

        <label>
          <span>Length</span>
          <input
            :value="form.garmentLength"
            type="text"
            placeholder="Regular length"
            @input="updateField('garmentLength', $event.target.value)"
          />
        </label>

        <label v-if="!isPantsCategory">
          <span>Neckline</span>
          <input
            :value="form.neckline"
            type="text"
            placeholder="Crew neck"
            @input="updateField('neckline', $event.target.value)"
          />
        </label>

        <label v-else>
          <span>Waist rise</span>
          <input
            :value="form.waistRise"
            type="text"
            placeholder="High rise"
            @input="updateField('waistRise', $event.target.value)"
          />
        </label>
      </template>
    </div>

    <div class="material-editor">
      <div class="material-editor__head">
        <span>Materials</span>
        <button type="button" class="ghost-button" @click="$emit('add-material-row')">Add material</button>
      </div>

      <p class="material-editor__hint">
        Choose a material from the master list or type a clean custom material name. Put percentages only in the Percent field.
      </p>

      <div v-if="form.materials.length" class="material-editor__rows">
        <div class="material-editor__row material-editor__row--header" aria-hidden="true">
          <span>Part name</span>
          <span>Material</span>
          <span>Percent</span>
          <span></span>
        </div>

        <div v-for="(material, index) in form.materials" :key="material.localKey || index" class="material-editor__row">
          <label>
            <span class="sr-only">Part name</span>
            <select
              :value="material.partName"
              @change="updateMaterialField(index, 'partName', $event.target.value)"
            >
              <option v-for="part in materialPartOptions" :key="part" :value="part">{{ part }}</option>
            </select>
          </label>

          <label>
            <span class="sr-only">Material</span>
            <input
              :value="material.materialName"
              type="text"
              :list="materialDatalistId(index)"
              placeholder="Select or type material"
              @input="updateMaterialField(index, 'materialName', $event.target.value)"
            />
            <datalist :id="materialDatalistId(index)">
              <option v-for="option in materialOptions" :key="option.id || option.slug || option.name" :value="option.name"></option>
            </datalist>
          </label>

          <label>
            <span class="sr-only">Percent</span>
            <input
              :value="material.materialPercent ?? ''"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="100"
              @input="updateMaterialField(index, 'materialPercent', $event.target.value)"
            />
          </label>

          <button type="button" class="material-editor__remove" @click="$emit('remove-material-row', index)">
            Remove
          </button>
        </div>
      </div>

      <p v-else class="material-editor__empty">No material rows yet.</p>

      <label class="studio-form__block material-editor__additional">
        <span>Additional material information</span>
        <textarea
          :value="form.materialInformationContent"
          rows="5"
          placeholder="The total weight of this product contains at least:"
          @input="updateField('materialInformationContent', $event.target.value)"
          @keydown.enter.stop
        ></textarea>
      </label>
    </div>
  </section>
</template>

<script>
export default {
  name: 'ProductDescriptionFields',
  props: {
    form: {
      type: Object,
      required: true
    },
    errorMessage: {
      type: String,
      default: ''
    },
    productGroupSlug: {
      type: String,
      default: 'clothing'
    },
    isPantsCategory: {
      type: Boolean,
      default: false
    },
    fitOptions: {
      type: Array,
      default: () => []
    },
    materialOptions: {
      type: Array,
      default: () => []
    },
    materialPartOptions: {
      type: Array,
      default: () => []
    }
  },
  emits: ['add-material-row', 'remove-material-row', 'update-field', 'update-material-row'],
  methods: {
    updateField(field, value) {
      this.$emit('update-field', {
        field,
        value
      });
    },
    updateMaterialField(index, field, value) {
      this.$emit('update-material-row', {
        index,
        field,
        value
      });
    },
    materialDatalistId(index) {
      return `product-material-options-${index}`;
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

.material-editor {
  display: grid;
  gap: var(--space-2);
}

.material-editor__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  font-weight: 800;
}

.material-editor__hint,
.material-editor__empty {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.material-editor__additional {
  margin-top: var(--space-1);
}

.material-editor__rows {
  display: grid;
  gap: var(--space-2);
}

.material-editor__row {
  display: grid;
  grid-template-columns: minmax(110px, 0.8fr) minmax(160px, 1.2fr) minmax(90px, 0.6fr) auto;
  gap: var(--space-2);
  align-items: center;
}

.material-editor__row--header {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.material-editor__remove {
  border: 0;
  background: transparent;
  color: var(--color-danger, #b42318);
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: 700;
  cursor: pointer;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 720px) {
  .material-editor__row,
  .material-editor__row--header {
    grid-template-columns: 1fr;
  }

  .material-editor__row--header {
    display: none;
  }
}
</style>
