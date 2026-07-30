<template>
  <div class="product-detail__visual">
    <PageBreadcrumbs :items="breadcrumbItems" />
    
    <!-- Desktop Gallery -->
    <div
      class="product-gallery"
      :class="{ 'product-gallery--single': productGalleryImages.length <= 1 }"
    >
      <!-- Thumbnail strip on the left -->
      <div v-if="productGalleryImages.length > 1" class="product-gallery__thumbnails">
        <button
          v-for="(image, index) in productGalleryImages"
          :key="index"
          type="button"
          class="product-gallery__thumbnail-btn"
          :class="{ 'product-gallery__thumbnail-btn--active': activeImageIndex === index }"
          @click="$emit('select-image', index)"
        >
          <img :src="image.src" :alt="image.alt" />
        </button>
      </div>

      <!-- Main visual display -->
      <div class="product-gallery__main">
        <!-- Main Image with Hover Zoom Wrapper -->
        <div
          v-if="productGalleryImages.length"
          class="product-gallery__image-container"
          :class="{ 'product-gallery__image-container--zoomed': isImageZoomed }"
          @mouseenter="activateImageZoom"
          @mousemove="moveImageZoom"
          @mouseleave="deactivateImageZoom"
        >
          <img
            class="product-gallery__main-image"
            :src="productGalleryImages[activeImageIndex].src"
            :alt="productGalleryImages[activeImageIndex].alt"
          />
          <div class="product-gallery__zoom-layer" :style="imageZoomStyle" aria-hidden="true"></div>
        </div>
        <div v-else class="product-gallery__empty">
          <span>HEM</span>
        </div>
      </div>
    </div>

    <!-- Mobile Swipeable Carousel -->
    <div v-if="productGalleryImages.length > 1" class="product-gallery__mobile-carousel">
      <div class="product-gallery__mobile-track" ref="mobileTrack" @scroll="handleMobileScroll">
        <div
          v-for="(image, index) in productGalleryImages"
          :key="index"
          class="product-gallery__mobile-slide"
          :class="{ 'product-gallery__mobile-slide--zoomed': mobileZoomIndex === index }"
          @click="toggleMobileZoom(index, $event)"
        >
          <img :src="image.src" :alt="image.alt" />
          <div class="product-gallery__mobile-zoom-layer" :style="mobileZoomStyle(index, image)" aria-hidden="true"></div>
        </div>
      </div>
      <div class="product-gallery__mobile-indicators">
        <span
          v-for="(image, index) in productGalleryImages"
          :key="index"
          class="product-gallery__dot"
          :class="{ 'product-gallery__dot--active': activeImageIndex === index }"
          @click="scrollToMobileIndex(index)"
        ></span>
      </div>
    </div>
  </div>
</template>

<script>
import PageBreadcrumbs from '../common/PageBreadcrumbs.vue';

export default {
  name: 'ProductGallery',
  components: {
    PageBreadcrumbs
  },
  props: {
    breadcrumbItems: {
      type: Array,
      default: () => []
    },
    productGalleryImages: {
      type: Array,
      default: () => []
    },
    activeImageIndex: {
      type: Number,
      default: 0
    }
  },
  emits: ['select-image'],
  data() {
    return {
      isImageZoomed: false,
      isPointerInsideImage: false,
      imageZoomTimer: null,
      zoomX: 50,
      zoomY: 50,
      mobileZoomIndex: null,
      mobileZoomX: 50,
      mobileZoomY: 50
    };
  },
  computed: {
    imageZoomStyle() {
      const image = this.productGalleryImages[this.activeImageIndex] || {};
      return this.zoomLayerStyle(image.src, this.zoomX, this.zoomY);
    }
  },
  watch: {
    activeImageIndex() {
      this.resetImageZoom();
      this.resetMobileZoom();
    },
    productGalleryImages() {
      this.resetImageZoom();
      this.resetMobileZoom();
    }
  },
  methods: {
    zoomLayerStyle(src, x = 50, y = 50) {
      const imageUrl = String(src || '').replace(/"/g, '\\"');

      return {
        backgroundImage: imageUrl ? `url("${imageUrl}")` : 'none',
        backgroundPosition: `${x}% ${y}%`
      };
    },
    zoomCoordinates(event) {
      const target = event && event.currentTarget;
      const rect = target && typeof target.getBoundingClientRect === 'function'
        ? target.getBoundingClientRect()
        : null;

      if (!rect || rect.width <= 0 || rect.height <= 0) {
        return {
          x: 50,
          y: 50
        };
      }

      const source = event && event.touches && event.touches.length
        ? event.touches[0]
        : event;
      const x = Math.min(100, Math.max(0, ((source.clientX - rect.left) / rect.width) * 100));
      const y = Math.min(100, Math.max(0, ((source.clientY - rect.top) / rect.height) * 100));

      return { x, y };
    },
    activateImageZoom(event) {
      const { x, y } = this.zoomCoordinates(event);
      this.zoomX = x;
      this.zoomY = y;
      this.isPointerInsideImage = true;
      this.clearImageZoomTimer();
      this.imageZoomTimer = window.setTimeout(() => {
        if (this.isPointerInsideImage) {
          this.isImageZoomed = true;
        }
        this.imageZoomTimer = null;
      }, 120);
    },
    moveImageZoom(event) {
      if (!this.isPointerInsideImage) {
        return;
      }

      const { x, y } = this.zoomCoordinates(event);
      this.zoomX = x;
      this.zoomY = y;
    },
    deactivateImageZoom() {
      this.resetImageZoom();
    },
    clearImageZoomTimer() {
      if (this.imageZoomTimer) {
        window.clearTimeout(this.imageZoomTimer);
        this.imageZoomTimer = null;
      }
    },
    resetImageZoom() {
      this.clearImageZoomTimer();
      this.isPointerInsideImage = false;
      this.isImageZoomed = false;
      this.zoomX = 50;
      this.zoomY = 50;
    },
    toggleMobileZoom(index, event) {
      if (this.mobileZoomIndex === index) {
        this.resetMobileZoom();
        return;
      }

      const { x, y } = this.zoomCoordinates(event);
      this.mobileZoomIndex = index;
      this.mobileZoomX = x;
      this.mobileZoomY = y;
    },
    mobileZoomStyle(index, image) {
      const x = this.mobileZoomIndex === index ? this.mobileZoomX : 50;
      const y = this.mobileZoomIndex === index ? this.mobileZoomY : 50;
      return this.zoomLayerStyle(image && image.src, x, y);
    },
    resetMobileZoom() {
      this.mobileZoomIndex = null;
      this.mobileZoomX = 50;
      this.mobileZoomY = 50;
    },
    handleMobileScroll(event) {
      if (this.mobileZoomIndex !== null) {
        this.resetMobileZoom();
      }

      const track = event.target;
      const width = track.clientWidth;
      if (width > 0) {
        this.$emit('select-image', Math.round(track.scrollLeft / width));
      }
    },
    scrollToMobileIndex(index) {
      this.$emit('select-image', index);
      const track = this.$refs.mobileTrack;
      if (track) {
        track.scrollTo({
          left: index * track.clientWidth,
          behavior: 'smooth'
        });
      }
    }
  },
  beforeUnmount() {
    this.clearImageZoomTimer();
  }
};
</script>

<style scoped>
.product-detail__visual {
  position: sticky;
  top: calc(var(--store-header-height, 102px) + 16px);
  align-self: start;
  min-width: 0;
  height: fit-content;
  z-index: 1;
  overflow-anchor: none;
}

.product-gallery {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 12px;
  width: min(100%, 540px);
}

.product-gallery.product-gallery--single {
  grid-template-columns: minmax(0, 1fr);
}

.product-gallery__thumbnails {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.product-gallery__thumbnail-btn {
  width: 76px;
  border: 1px solid #e4e4e4;
  background: #ffffff;
  padding: 0;
  overflow: visible;
  cursor: pointer;
  border-radius: 6px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-gallery__thumbnail-btn img {
  width: 100%;
  height: auto;
  display: block;
  transition: opacity 0.25s ease;
}

.product-gallery__thumbnail-btn:hover {
  border-color: #b5b5b5;
}

.product-gallery__thumbnail-btn:hover img {
  opacity: 0.92;
}

.product-gallery__thumbnail-btn--active {
  border-color: #1a1a1a;
  box-shadow: 0 0 0 1px #1a1a1a;
}

.product-gallery__main {
  width: 100%;
  background: #ffffff;
  overflow: visible;
  position: relative;
  border-radius: 8px;
  overflow-anchor: none;
}

.product-gallery__image-container {
  width: 100%;
  overflow: visible;
  display: block;
  background: #ffffff;
  border-radius: 8px;
  position: relative;
  transform: translateZ(0);
  cursor: zoom-in;
  isolation: isolate;
}

.product-gallery__main-image {
  width: 100%;
  height: auto;
  display: block;
  transition: opacity 0.18s ease;
  backface-visibility: hidden;
}

.product-gallery__image-container--zoomed {
  overflow: hidden;
  cursor: zoom-out;
}

.product-gallery__zoom-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  background-repeat: no-repeat;
  background-size: 190% auto;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.22s ease;
  will-change: opacity, background-position;
}

.product-gallery__image-container--zoomed .product-gallery__zoom-layer {
  opacity: 1;
}

.product-gallery__image-container:hover .product-gallery__main-image {
  opacity: 1;
}

.product-gallery__mobile-carousel {
  display: none;
  border-radius: 8px;
  overflow: visible;
}

.product-gallery__mobile-track {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.product-gallery__mobile-track::-webkit-scrollbar {
  display: none;
}

.product-gallery__mobile-slide {
  flex: 0 0 100%;
  scroll-snap-align: start;
  background: #ffffff;
  display: block;
  position: relative;
  overflow: hidden;
  cursor: zoom-in;
  isolation: isolate;
}

.product-gallery__mobile-slide img {
  width: 100%;
  height: auto;
  display: block;
}

.product-gallery__mobile-zoom-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  background-repeat: no-repeat;
  background-size: 175% auto;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.22s ease;
}

.product-gallery__mobile-slide--zoomed {
  cursor: zoom-out;
}

.product-gallery__mobile-slide--zoomed .product-gallery__mobile-zoom-layer {
  opacity: 1;
}

.product-gallery__mobile-indicators {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 10px;
}

.product-gallery__mobile-indicators span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(20, 20, 20, 0.22);
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.product-gallery__mobile-indicators span.product-gallery__dot--active {
  background: #1a1a1a;
  transform: scale(1.15);
}

.product-gallery__empty {
  width: 100%;
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  font-size: 20px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: #ffffff;
}

@media (max-width: 1024px) {
  .product-gallery {
    grid-template-columns: 72px 1fr;
    gap: 14px;
  }

  .product-gallery.product-gallery--single {
    grid-template-columns: minmax(0, 1fr);
  }

  .product-gallery__thumbnail-btn {
    width: 72px;
  }
}

@media (max-width: 768px) {
  .product-gallery {
    grid-template-columns: 1fr;
  }

  .product-gallery__thumbnails {
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .product-gallery__thumbnail-btn {
    flex-shrink: 0;
  }


}

@media (max-width: 960px) {
  .product-detail__visual {
    position: static;
    top: auto;
  }

  .product-gallery {
    display: none;
  }

  .product-gallery__mobile-carousel {
    display: block;
  }
}
</style>
