<template>
  <div
    class="product-visual"
    :class="{
      'product-visual--compact': compact,
      'product-visual--large': large,
      'product-visual--has-images': images.length,
      'product-visual--has-secondary': Boolean(hoverImage)
    }"
    @mouseenter="isHovering = true"
    @mouseleave="isHovering = false"
    @focusin="isHovering = true"
    @focusout="isHovering = false"
  >
    <div v-if="images.length" class="product-visual__images" aria-hidden="true">
      <img
        class="product-visual__image product-visual__image--primary"
        :src="activeImage.src"
        :alt="activeImage.alt"
        loading="lazy"
      />
      <img
        v-if="hoverImage"
        class="product-visual__preload"
        :src="hoverImage.src"
        alt=""
        aria-hidden="true"
        loading="lazy"
      />
    </div>

    <div v-else class="product-visual__empty" aria-hidden="true">
      <span>HEM</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProductVisual',
  props: {
    product: {
      type: Object,
      required: true
    },
    compact: {
      type: Boolean,
      default: false
    },
    large: {
      type: Boolean,
      default: false
    },
    color: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      isHovering: false
    };
  },
  computed: {
    activeImage() {
      return this.isHovering && this.hoverImage ? this.hoverImage : this.images[0];
    },
    hoverImage() {
      return this.images[1] || null;
    },
    images() {
      const imageObjects = this.product && Array.isArray(this.product.productImages)
        ? this.product.productImages
        : [];
      const imageUrls = this.product && Array.isArray(this.product.images)
        ? this.product.images
        : this.product && Array.isArray(this.product.imageUrls)
          ? this.product.imageUrls
          : [];
      const value = imageObjects.length
        ? imageObjects
        : imageUrls.length
          ? imageUrls
          : this.product && typeof this.product.imageUrl === 'string'
            ? [this.product.imageUrl]
            : [];
      const selectedColor = String(
        this.color ||
        (this.product && (this.product.color || this.product.colorName || this.product.color_name)) ||
        ''
      ).trim().toLowerCase();
      const selectedVariantId = String(
        this.product && (
          this.product.selectedColorVariantId ||
          this.product.colorVariantId ||
          this.product.color_variant_id
        ) ||
        ''
      ).trim();
      const normalizedImages = value
        .map((item, index) => {
          if (typeof item === 'string') {
            return {
              src: item.trim(),
              alt: this.product.name || 'HEM product',
              colorVariantId: '',
              colorName: '',
              isPrimary: index === 0,
              sortOrder: index
            };
          }

          return {
            src: String(item.imageUrl || item.image_url || item.url || '').trim(),
            alt: String(item.altText || item.alt_text || this.product.name || 'HEM product').trim(),
            colorVariantId: String(item.colorVariantId || item.color_variant_id || '').trim(),
            colorName: String(item.colorName || item.color_name || '').trim().toLowerCase(),
            isPrimary: Boolean(item.isPrimary || item.is_primary),
            sortOrder: Number(item.sortOrder || item.sort_order || index)
          };
        })
        .filter(item => item.src)
        .sort((left, right) => {
          if (selectedVariantId) {
            const leftMatches = left.colorVariantId === selectedVariantId ? 1 : 0;
            const rightMatches = right.colorVariantId === selectedVariantId ? 1 : 0;

            if (leftMatches !== rightMatches) {
              return rightMatches - leftMatches;
            }
          }

          if (selectedColor) {
            const leftMatches = left.colorName === selectedColor ? 1 : 0;
            const rightMatches = right.colorName === selectedColor ? 1 : 0;

            if (leftMatches !== rightMatches) {
              return rightMatches - leftMatches;
            }
          }

          if (left.isPrimary !== right.isPrimary) {
            return left.isPrimary ? -1 : 1;
          }

          return left.sortOrder - right.sortOrder;
        });

      const variantImages = selectedVariantId
        ? normalizedImages.filter(image => image.colorVariantId === selectedVariantId)
        : [];
      const colorImages = selectedColor
        ? normalizedImages.filter(image => image.colorName === selectedColor)
        : [];
      const imagePool = variantImages.length ? variantImages : colorImages.length ? colorImages : normalizedImages;
      const primaryImage = imagePool[0];

      if (!primaryImage) {
        return [];
      }

      const secondaryImage = imagePool.find(image => {
        if (image.src === primaryImage.src) {
          return false;
        }

        if (primaryImage.colorName) {
          return image.colorName === primaryImage.colorName;
        }

        return true;
      });

      return secondaryImage ? [primaryImage, secondaryImage] : [primaryImage];
    }
  }
};
</script>
<style scoped>
/* ProductVisual chỉ giữ CSS của hình ảnh sản phẩm; grid/card do component cha quản lý. */
.product-visual {
  position: relative;
  width: 100%;
  overflow: visible;
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: var(--color-text-primary);
  box-shadow: none;
  transform: translateZ(0);
}

/* IMAGE WRAPPER */
.product-visual__images {
  position: relative;
  display: block;
  width: 100%;
  z-index: 0;
}

.product-visual__image {
  position: static;
  display: block;
  width: 100%;
  height: auto;
  transition:
    opacity 0.45s ease,
    transform 0.45s ease;
}

.product-visual__image--secondary {
  display: none;
}

.product-visual__preload {
  display: none;
}

.product-visual--has-images::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.02) 0%,
    rgba(0, 0, 0, 0.12) 100%
  );
  pointer-events: none;
}

.product-visual--has-secondary:hover .product-visual__image--primary {
  opacity: 1;
  transform: none;
}

.product-visual--has-secondary:hover .product-visual__image--secondary {
  display: none;
  opacity: 0;
  transform: none;
}

.product-visual__empty {
  position: relative;
  min-height: 220px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(17, 17, 17, 0.08);
  color: rgba(17, 17, 17, 0.38);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
}

/* SIZE VARIANTS */
.product-visual--compact {
  width: 100%;
}

.product-visual--large {
  width: 100%;
}

</style>
