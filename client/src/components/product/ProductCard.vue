<template>
  <article class="product-card">
    <div class="product-card__visual">
      <router-link :to="productLink" class="product-card__visual-link">
        <product-visual :product="product" :compact="compact" />
      </router-link>

      <div v-if="productTags.length" class="product-card__badges" aria-label="Product badges">
        <span
          v-for="tag in productTags"
          :key="tag.label"
          class="product-card__badge"
          :class="`product-card__badge--${tag.tone}`"
        >
          {{ tag.label }}
        </span>
      </div>

      <div class="product-card__float">
        <button
          type="button"
          class="product-card__save"
          :class="{ 'product-card__save--active': isFavorite }"
          :aria-pressed="isFavorite ? 'true' : 'false'"
          :aria-label="isFavorite ? 'Remove from favorites' : 'Save to favorites'"
          :disabled="isTogglingFavorite"
          @click="toggleFavorite"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 20.5l-1.1-1C5.4 14.6 2 11.6 2 7.9 2 5 4.2 3 7 3c1.7 0 3.4.8 4.5 2.2C12.6 3.8 14.3 3 16 3c2.8 0 5 2 5 4.9 0 3.7-3.4 6.7-8.9 11.6L12 20.5z"
            />
          </svg>
        </button>
      </div>

    </div>

    <div class="product-card__content" :class="{ 'product-card__content--compact': compact }">
      <div class="product-card__meta-line">
        <span>{{ product.collection }}</span>
        <span v-if="hasReviews" class="product-card__rating" :title="`${displayRating.toFixed(1)} rating from ${reviewCount} reviews`">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2.8l2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 2.8z"
            />
          </svg>
          <strong>{{ displayRating.toFixed(1) }}</strong>
          <span>({{ reviewCount }})</span>
        </span>
      </div>

      <router-link :to="productLink" class="product-card__title">
        {{ product.name }}
      </router-link>

      <div class="product-card__price-row">
  <!-- SALE -->
  <template v-if="hasSalePrice">
    <div class="product-card__price-stack product-card__price-stack--sale">
      <div class="product-card__price-promo">
        <strong class="product-card__price-amount product-card__price-amount--sale price-current price-current--sale">
          <span v-if="pricePrefix" class="product-card__price-prefix">{{ pricePrefix }}</span>
          {{ formatCurrency(displayPrice) }}
        </strong>
        <span class="product-card__price-original product-card__price-original--sale price-compare price-compare--sale">
          {{ formatCurrency(comparePrice) }}
        </span>
      </div>
    </div>
  </template>

  <!-- REGULAR -->
  <template v-else>
    <div class="product-card__price-main">
      <strong class="product-card__price-amount price-current">
        <span v-if="pricePrefix" class="product-card__price-prefix">{{ pricePrefix }}</span>
        {{ formatCurrency(displayPrice) }}
      </strong>
    </div>
  </template>
</div>

<div
  class="product-card__swatches"
  :class="{ 'product-card__swatches--empty': !colorSwatches.length }"
  :aria-label="colorSwatches.length ? 'Available colors' : undefined"
  :aria-hidden="colorSwatches.length ? 'false' : 'true'"
>
  <span
    v-for="color in colorSwatches"
    :key="color.name"
    class="product-card__swatch"
    :title="color.name"
    :style="{ background: color.hex }"
  ></span>
</div>

    </div>
  </article>
</template>

<script>
import { productCardMethods } from './logic/productCardMethods';
import { authStore } from '../../stores/authStore';
import { normalizeDepartment } from '../../stores/catalogStore';
import { normalizeColorOption } from '../../helpers/colors';
import ProductVisual from './ProductVisual.vue';
import { favoritesStore } from '../../stores/wishlistStore';

const LISTING_FILTER_KEYS = ['q', 'category', 'fit', 'color', 'size', 'minPrice', 'maxPrice', 'sort', 'page'];
const SPECIAL_PAGE_SEGMENTS = new Set(['new-arrivals', 'bestsellers', 'best-sellers', 'sale']);

export default {
  name: 'ProductCard',
  components: {
    ProductVisual
  },
  props: {
    product: {
      type: Object,
      required: true
    },
    compact: {
      type: Boolean,
      default: false
    },
    accentAction: {
      type: Boolean,
      default: false
    },
    showPreviewTag: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      session: authStore.getSession(),
      isFavorite: false,
      isTogglingFavorite: false
    };
  },
  computed: {
    favoriteColorVariantId() {
      const firstColor = Array.isArray(this.product.colors) ? this.product.colors[0] : null;

      return String(
        this.product.selectedColorVariantId ||
        this.product.colorVariantId ||
        this.product.color_variant_id ||
        (firstColor && (firstColor.colorVariantId || firstColor.color_variant_id || firstColor.id)) ||
        ''
      ).trim();
    },
    favoriteColorName() {
      const firstColor = Array.isArray(this.product.colors) ? this.product.colors[0] : null;

      return String(
        this.product.selectedColor ||
        this.product.colorName ||
        this.product.color_name ||
        this.product.color ||
        (firstColor && (firstColor.colorName || firstColor.color_name || firstColor.name)) ||
        ''
      ).trim();
    },
    reviewCount() {
      return Math.max(0, Number.parseInt(this.product.reviews, 10) || 0);
    },
    hasReviews() {
      return this.reviewCount > 0;
    },
    displayRating() {
      if (!this.hasReviews) return 0;
      const rating = Number(this.product.rating);
      return Number.isFinite(rating) ? Math.min(Math.max(rating, 0), 5) : 0;
    },
    pricingMode() {
      const mode = String(
        this.product.listingPricingMode ||
        this.product.listing_pricing_mode ||
        this.product.pricingMode ||
        this.product.pricing_mode ||
        ''
      ).toLowerCase();

      if (['regular', 'sale'].includes(mode)) {
        return mode;
      }

      if (this.product.isSale || this.product.is_sale) return 'sale';
      return 'regular';
    },
    pricePrefix() {
      return String(
        this.product.pricePrefix ||
        this.product.price_prefix ||
        (this.product.priceVaries || this.product.price_varies ? 'From' : '')
      ).trim();
    },
    hasSalePrice() {
      return this.pricingMode === 'sale' && this.comparePrice > this.displayPrice;
    },
    displayPrice() {
      const listingPrice = Number(this.product.listingPrice ?? this.product.listing_price);
      if (Number.isFinite(listingPrice) && listingPrice >= 0) {
        return listingPrice;
      }

      const price = Number(this.product.price || 0);
      const salePrice = Number(this.product.salePrice ?? this.product.sale_price ?? 0);

      if (this.pricingMode === 'sale' && salePrice > 0 && this.comparePrice > salePrice) {
        return salePrice;
      }

      return price;
    },
    comparePrice() {
      return Number(
        this.product.listingComparePrice ??
        this.product.listing_compare_price ??
        this.product.originalPrice ??
        this.product.original_price ??
        this.product.comparePrice ??
        this.product.compare_price ??
        this.product.price ??
        0
      );
    },
    saleDiscountPercent() {
      const value = Number(
        this.product.saleDiscountPercent ??
        this.product.sale_discount_percent ??
        this.product.discountPercent ??
        this.product.discount_percent ??
        0
      );

      if (Number.isFinite(value) && value > 0) {
        return Math.ceil(value);
      }

      if (!this.hasSalePrice || this.comparePrice <= 0) {
        return 0;
      }

      return Math.ceil(((this.comparePrice - this.displayPrice) / this.comparePrice) * 100);
    },
    productTags() {
      const hasSaleTag = this.hasSalePrice ||
        this.product.hasSalePricing ||
        this.product.has_sale_pricing ||
        this.product.isSale ||
        this.product.is_sale;
      const menuTag = this.showPreviewTag
        ? String(
          this.product.megaMenuTag ||
          this.product.mega_menu_tag ||
          this.product.previewTag ||
          this.product.preview_tag ||
          ''
        ).trim()
        : '';
      const tags = [];

      if (menuTag) {
        tags.push({ label: menuTag, tone: 'collection' });
      }

      if (hasSaleTag) {
        const saleLabel = this.saleDiscountPercent ? `Sale ${this.saleDiscountPercent}%` : 'Sale';
        tags.push({ label: saleLabel, tone: 'sale' });
      }

      return tags.slice(0, 2);
    },
    colorSwatches() {
      const colors = Array.isArray(this.product.colors) ? this.product.colors : [];
      const fallbackColor = this.product.primaryColor ? [{ name: this.product.primaryColor }] : [];

      return (colors.length ? colors : fallbackColor)
        .map(color => normalizeColorOption(color))
        .filter(color => color.name)
        .slice(0, 5);
    },
    productLink() {
      const department = normalizeDepartment(this.product.gender);
      const pathParts = this.$route.path.split('/').filter(Boolean);
      const primarySegment = pathParts[1] || '';
      const isDepartmentRoute = pathParts[0] === 'women' || pathParts[0] === 'men';
      const nextQuery = {};

      LISTING_FILTER_KEYS.forEach(key => {
        if (this.$route.query[key] !== undefined) {
          nextQuery[key] = this.$route.query[key];
        }
      });

      ['from', 'fromCategory', 'fromCollection'].forEach(key => {
        if (this.$route.query[key] !== undefined) {
          nextQuery[key] = this.$route.query[key];
        }
      });

      if (isDepartmentRoute && !nextQuery.from && !nextQuery.fromCategory && !nextQuery.fromCollection) {
        if (SPECIAL_PAGE_SEGMENTS.has(primarySegment)) {
          nextQuery.from = primarySegment;
        } else if (primarySegment === 'collections' && pathParts[2]) {
          nextQuery.fromCollection = decodeURIComponent(pathParts[2]);
        } else if (primarySegment === 'all-products') {
          nextQuery.from = 'all-products';
        } else if (primarySegment && primarySegment !== 'product') {
          nextQuery.fromCategory = decodeURIComponent(primarySegment);
        }
      }

      const selectedVariantId = String(
        this.product.selectedColorVariantId ||
        this.product.colorVariantId ||
        this.product.color_variant_id ||
        ''
      ).trim();
      const selectedColorName = String(
        this.product.selectedColor ||
        this.product.colorName ||
        this.product.color_name ||
        this.product.color ||
        ''
      ).trim();

      if (selectedVariantId) {
        nextQuery.variant = selectedVariantId;
      }

      if (selectedColorName) {
        nextQuery.colorName = selectedColorName;
      }

      return {
        path: `/${department}/product/${this.product.slug || this.product.id}`,
        query: nextQuery
      };
    }
  },
  created() {
    this.handleFavoritesUpdate = () => {
      this.isFavorite = authStore.isUser()
        ? favoritesStore.isFavorite(this.product.id, this.favoriteColorVariantId)
        : false;
    };

    this.handleSessionChange = async () => {
      this.session = authStore.getSession();

      if (authStore.isUser()) {
        await favoritesStore.sync();
      }

      this.handleFavoritesUpdate();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('favorites-updated', this.handleFavoritesUpdate);
      window.addEventListener('auth-updated', this.handleSessionChange);
      window.addEventListener('storage', this.handleSessionChange);
    }

    this.handleFavoritesUpdate();
  },
  beforeUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('favorites-updated', this.handleFavoritesUpdate);
      window.removeEventListener('auth-updated', this.handleSessionChange);
      window.removeEventListener('storage', this.handleSessionChange);
    }
  },
  methods: productCardMethods
};
</script>

<style scoped>
.product-card {
  position: relative;
  width: 100%;
  min-width: 0;
  overflow: visible;
}

/* VISUAL */
.product-card__visual {
  position: relative;
  overflow: visible;
}

.product-card__visual-link {
  display: block;
  text-decoration: none;
}

.product-card__badges {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 4;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 5px;
  pointer-events: none;
}

.product-card__badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 10px;
  border-radius: 2px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  backdrop-filter: blur(12px);
  border: none;
  background: rgba(15, 15, 15, 0.72);
  color: #ffffff;
}

.product-card__badge--best {
  background: rgba(15, 15, 15, 0.82);
  color: #ffffff;
}

.product-card__badge--new {
  background: rgba(255, 255, 255, 0.82);
  color: #111111;
}

.product-card__badge--sale {
  background: #ffc83d;
  color: #111111;
}

.product-card__badge--collection {
  background: rgba(17, 17, 17, 0.78);
  color: #ffffff;
}

:deep(.product-visual) {
  width: 100%;
  border-radius: 0;
  overflow: visible;

  box-shadow: none;
  transform: translateZ(0);

  transition:
    transform 0.45s ease,
    opacity 0.45s ease;
}

:deep(.product-visual__image) {
  display: block;
  width: 100%;
  height: auto;
  transition:
    opacity 0.45s ease;
}

.product-card:hover :deep(.product-visual__image) {
  transform: none;
}

:deep(.product-visual__eyebrow),
:deep(.product-visual__monogram) {
  display: none;
}

/* FLOAT SAVE BUTTON */
.product-card__float {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 5;

  display: flex;
  align-items: center;
  justify-content: flex-end;

  pointer-events: none;
}

.product-card__save {
  pointer-events: auto;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: 42px;
  height: 42px;

  border: 0;
  background: transparent;

  color: rgba(255, 255, 255, 0.92);

  cursor: pointer;

  transition:
    transform 0.2s ease,
    color 0.2s ease,
    opacity 0.2s ease;
}

:global(html body.hem-shop-shell #app .product-card .product-card__save),
:global(html body.hem-shop-shell #app .product-card .product-card__save:hover),
:global(html body.hem-shop-shell #app .product-card .product-card__save--active),
:global(html body.hem-shop-shell #app .product-card .product-card__save--active:hover) {
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.product-card__save svg {
  width: 17px;
  height: 17px;

  fill: transparent;
  stroke: currentColor;
  stroke-width: 1.7;
  filter: drop-shadow(0 1px 2px rgba(17, 17, 17, 0.5));
  transition: fill 0.2s ease, transform 0.2s ease;
}

.product-card__save:hover {
  color: #d92d20;
  transform: translateY(-1px);
}

.product-card__save--active {
  color: #d92d20;
}

.product-card__save--active svg {
  fill: #d92d20;
  transform: scale(1.08);
}

.product-card__save:hover svg {
  fill: rgba(217, 45, 32, 0.18);
  transform: scale(1.08);
}

.product-card__save--active:hover svg {
  fill: #d92d20;
}

/* CONTENT */
.product-card__content {
  position: relative;
  width: 100%;
  min-width: 0;
  max-width: 100%;

  display: grid;
  grid-template-rows:
    minmax(14px, auto)
    minmax(3em, auto)
    minmax(43px, auto)
    14px;
  align-content: start;
  gap: 6px;

  overflow: hidden;

  /* fashion editorial spacing */
  padding: 16px 0 14px 14px;
}

.product-card__content--compact {
  gap: 4px;
}

/* META */
.product-card__meta-line {
  width: 100%;
  min-width: 0;
  min-height: 14px;

  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;

 color: var(--color-ink-30, rgba(20, 20, 20, 0.30));

  font-size: 9px;
  font-weight: 500;

  letter-spacing: 0.18em;
  text-transform: uppercase;
}

/* RATING */
.product-card__rating {
  display: inline-flex;
  align-items: center;
  gap: 4px;

  flex-shrink: 0;
  white-space: nowrap;

  font-size: 11px;
  color: rgba(20, 20, 20, 0.56);
}

.product-card__rating svg {
  width: 12px;
  height: 12px;
  fill: var(--color-rating-star);
}

.product-card__rating strong {
  font-weight: 600;
  color: rgba(17, 17, 17, 0.9);
}

/* TITLE */
.product-card__title {
  display: -webkit-box;
  min-height: 3em;

  overflow: hidden;

  line-clamp: 2;
  -webkit-line-clamp: 2;

  -webkit-box-orient: vertical;

  text-decoration: none;
  word-break: break-word;

  font-size: 14px;
  font-weight: 500;

  line-height: 1.5;
  letter-spacing: 0.12em;
  text-transform: uppercase;

  color: #111;

  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.product-card__title:hover {
  opacity: 0.68;
}

.product-card__content--compact .product-card__title {
  font-size: 13px;
}

.product-card__content--compact .product-card__price-main strong {
  font-size: 13px;
}

/* PRICE */
.product-card__price-row {
  margin-top: 4px;
  min-width: 0;
  min-height: 43px;
  display: grid;
  align-content: start;
}

.product-card__price-main {
  display: flex;
  align-items: baseline;
}

.product-card__price-stack {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.product-card__price-original {
  min-width: 0;
  font-size: 11.5px;
  font-weight: 500;
  color: #111111;
  letter-spacing: 0.01em;
  line-height: 1.4;
}

.product-card__price-label {
  color: #9b7600;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.25;
  text-transform: uppercase;
}

.product-card__price-promo {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: nowrap;
  min-width: 0;
}

.product-card__price-amount {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: #111;
}

.product-card__price-prefix {
  margin-right: 3px;
  color: currentColor;
  font-size: 0.78em;
  font-weight: 500;
}

.product-card__price-amount--sale {
  color: #c0392b;
}

.product-card__discount {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  min-height: 22px;
  padding: 0 7px;
  border-radius: 0;
  background: #ffc83d;
  color: #111111;
  font-size: 11.5px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.product-card__content--compact .product-card__price-amount {
  font-size: 13px;
}

.product-card__content--compact .product-card__price-original {
  font-size: 11px;
}

.product-card__swatches {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 14px;
  margin-top: 0;
}

.product-card__swatches--empty {
  visibility: hidden;
}

.product-card__swatch {
  width: 12px;
  height: 12px;
  border: 1px solid rgba(17, 17, 17, 0.22);
  border-radius: 2px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.28);
}

/* GRID */
.shop-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 22px;
}

.shop-grid > * {
  min-width: 0;
}

/* HOVER */
@media (hover: hover) and (pointer: fine) {
  .product-card:hover {
    opacity: 0.98;
  }

  .product-card:hover :deep(.product-visual) {
    transform: none;
  }
}

/* TABLET */
@media (max-width: 1200px) {
  .shop-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }
}

/* MOBILE */
@media (max-width: 768px) {
  .shop-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .product-card__content {
    padding: 12px 0 12px 10px;
  }

  .product-card__title {
    font-size: 13px;
    letter-spacing: 0.08em;
  }

  .product-card__price-amount {
    font-size: 13px;
  }

  .product-card__price-original {
    font-size: 11px;
  }

  .product-card__save {
    width: 38px;
    height: 38px;
  }

}
</style>
