<template>
  <div class="studio-form__subsection">
    <div class="studio-form__subsection-head">
      <span>Images</span>
      <label class="studio-form__upload-inline">
        <input type="file" accept="image/*" multiple @change="$emit('upload-images', $event)" />
        Upload image
      </label>
    </div>

    <div v-if="color.images.length" class="studio-form__image-grid">
      <div v-for="(image, imageIndex) in color.images" :key="image.localKey || image.id || image.imageUrl" class="studio-form__image-card">
        <img :src="image.previewUrl || image.imageUrl" :alt="image.altText || productName" />
        <input v-model.trim="image.altText" type="text" placeholder="Alt text" />
        <div class="studio-form__image-actions">
          <button type="button" class="text-button" :class="{ 'is-active': image.isPrimary }" @click="$emit('set-primary-image', imageIndex)">
            {{ image.isPrimary ? 'Primary' : 'Set primary' }}
          </button>
          <button type="button" class="text-button text-button--danger" @click="$emit('remove-image', imageIndex)">
            Remove
          </button>
        </div>
      </div>
    </div>
    <p v-else class="studio-form__hint">No image yet. Upload at least one Cloudinary image for this color.</p>
  </div>
</template>

<script>
export default {
  name: 'ProductImageUploader',
  props: {
    color: {
      type: Object,
      required: true
    },
    colorIndex: {
      type: Number,
      required: true
    },
    productName: {
      type: String,
      default: ''
    }
  },
  emits: ['upload-images', 'set-primary-image', 'remove-image']
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

.studio-form__subsection-head,
.studio-form__image-actions {
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

.studio-form__upload-inline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid rgba(17, 17, 17, 0.16);
  border-radius: 10px;
  cursor: pointer;
  font-weight: 800;
  transition: opacity 180ms ease, background 180ms ease;
}

.studio-form__upload-inline:hover {
  background: rgba(17, 17, 17, 0.04);
}

.studio-form__upload-inline input {
  display: none;
}

.studio-form__image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.studio-form__image-card {
  display: grid;
  gap: 8px;
  padding: 8px;
  border: 1.5px solid rgba(17, 17, 17, 0.08);
  border-radius: 12px;
  background: #ffffff;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.studio-form__image-card img {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  border-radius: 8px;
  background: #ede8e1;
}

.studio-form__image-card input[type="text"] {
  font-size: 11.5px !important;
  padding: 5px 8px !important;
  border-radius: 6px !important;
  border: 1px solid rgba(17,17,17,0.12) !important;
  background: #fff !important;
  color: var(--color-text-secondary);
}

.studio-form__image-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  flex-wrap: wrap;
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

.text-button.is-active {
  background: #7c5c3a;
  border-color: #7c5c3a;
  color: #fff;
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
}
</style>
