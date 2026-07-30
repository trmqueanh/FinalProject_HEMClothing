<template>
  <div class="page-section favorites-view">
    <PageBreadcrumbs class="favorites-breadcrumbs" :items="breadcrumbItems" />

    <header class="favorites-header">
      <h1>FAVORITES</h1>
    </header>

    <section v-if="isLoading" class="shell-card favorites-empty" role="status">
      <h2>Loading favorites…</h2>
      <p>We are retrieving your saved items.</p>
    </section>

    <section v-else-if="hasLoadError" class="shell-card favorites-empty">
      <h2>Unable to load favorites.</h2>
      <p>Please check your connection and try again.</p>
      <button type="button" class="primary-button" @click="loadProducts">Try again</button>
    </section>

    <!-- Has items -->
    <section v-else-if="favoriteProducts.length" class="favorites-catalog">

      <!-- Item count -->
      <div class="favorites-meta">
        <p class="favorites-count" aria-live="polite" aria-atomic="true">
          <strong>{{ favoriteProducts.length }}</strong>
          <span>{{ favoriteProducts.length === 1 ? 'Item' : 'Items' }}</span>
        </p>
      </div>

      <!-- Grid -->
      <FavoritesProductGrid :products="paginatedFavoriteProducts" />

      <nav v-if="paginationTotalPages > 1" class="favorites-pagination" aria-label="Favorites pagination">
        <button type="button" :disabled="currentPage <= 1" @click="setPage(currentPage - 1)">Previous</button>
        <span>Page {{ safeCurrentPage }} of {{ paginationTotalPages }}</span>
        <button type="button" :disabled="currentPage >= paginationTotalPages" @click="setPage(currentPage + 1)">Next</button>
      </nav>
    </section>

    <!-- Empty state -->
    <section v-else class="shell-card favorites-empty">
      <h2>No favorites yet.</h2>
      <p>Browse the shop and tap Save on any item you want to keep in your wishlist.</p>
      <router-link to="/women" class="primary-button">Go to shop</router-link>
    </section>
  </div>
</template>

<script>
import PageBreadcrumbs from '../../components/common/PageBreadcrumbs.vue';
import FavoritesProductGrid from '../../components/wishlist/FavoritesProductGrid.vue';
import { authStore } from '../../stores/authStore';
import { catalogStore } from '../../stores/catalogStore';
import { favoritesStore } from '../../stores/wishlistStore';
import { expandProductsToColorCards, listingFavoriteKeyForProduct, parseListingFavoriteKey } from '../../helpers/shop/listingColorCards';

const FAVORITES_ROWS_PER_PAGE = 3;

const favoriteColumnCountForViewport = () => {
  if (typeof window === 'undefined') {
    return 4;
  }

  const width = window.innerWidth;

  if (width >= 1920) return 5;
  if (width <= 860) return 2;
  if (width <= 1180) return 3;

  return 4;
};

export default {
  name: 'WishlistView',
  components: {
    PageBreadcrumbs,
    FavoritesProductGrid
  },
  data() {
    return {
      products: [],
      favoriteIds: favoritesStore.getIds(),
      currentPage: 1,
      favoriteColumnCount: favoriteColumnCountForViewport(),
      isLoading: false,
      hasLoadError: false
    };
  },
  computed: {
    breadcrumbItems() {
      return [
        { label: 'hem.com', route: { path: '/women' } },
        { label: 'favorites', current: true }
      ];
    },
    favoriteProducts() {
      const favoriteKeySet = new Set(this.favoriteIds);
      const legacyProductIds = new Set(
        this.favoriteIds
          .map(key => parseListingFavoriteKey(key))
          .filter(item => item.productId && !item.colorVariantId)
          .map(item => item.productId)
      );
      const usedLegacyProductIds = new Set();

      return expandProductsToColorCards(this.products).filter(product => {
        const favoriteKey = listingFavoriteKeyForProduct(product);

        if (favoriteKey && favoriteKeySet.has(favoriteKey)) {
          return true;
        }

        const productId = String(product.id || '').trim();

        if (productId && legacyProductIds.has(productId) && !usedLegacyProductIds.has(productId)) {
          usedLegacyProductIds.add(productId);
          return true;
        }

        return false;
      });
    },
    productsPerPage() {
      return Math.max(1, this.favoriteColumnCount * FAVORITES_ROWS_PER_PAGE);
    },
    paginationTotalPages() {
      return Math.max(1, Math.ceil(this.favoriteProducts.length / this.productsPerPage));
    },
    safeCurrentPage() {
      return Math.min(Math.max(1, this.currentPage), this.paginationTotalPages);
    },
    paginatedFavoriteProducts() {
      const start = (this.safeCurrentPage - 1) * this.productsPerPage;
      return this.favoriteProducts.slice(start, start + this.productsPerPage);
    }
  },
  watch: {
    favoriteProducts() {
      if (this.currentPage > this.paginationTotalPages) {
        this.currentPage = this.paginationTotalPages;
      }
    }
  },
  methods: {
    async loadProducts() {
      this.isLoading = true;
      this.hasLoadError = false;

      try {
        const [products, favoriteIds] = await Promise.all([
          catalogStore.getProducts(),
          authStore.isUser() ? favoritesStore.sync({ force: true }) : Promise.resolve([])
        ]);
        this.products = products;
        this.favoriteIds = favoritesStore.getIds();
        this.hasLoadError = authStore.isUser() && favoriteIds === null;
      } finally {
        this.isLoading = false;
      }
    },
    updateFavoriteColumnCount() {
      this.favoriteColumnCount = favoriteColumnCountForViewport();
    },
    setPage(page) {
      this.currentPage = Math.min(Math.max(1, Number(page) || 1), this.paginationTotalPages);
      this.$nextTick(() => {
        const target = this.$el && this.$el.querySelector('.favorites-count');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  },
  created() {
    this.handleFavoritesUpdate = () => {
      this.favoriteIds = favoritesStore.getIds();
    };
    this.handleAuthUpdate = async () => {
      if (authStore.isUser()) await favoritesStore.sync({ force: true });
      this.favoriteIds = favoritesStore.getIds();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('favorites-updated', this.handleFavoritesUpdate);
      window.addEventListener('auth-updated', this.handleAuthUpdate);
      window.addEventListener('storage', this.handleAuthUpdate);
      window.addEventListener('resize', this.updateFavoriteColumnCount, { passive: true });
    }
  },
  beforeUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('favorites-updated', this.handleFavoritesUpdate);
      window.removeEventListener('auth-updated', this.handleAuthUpdate);
      window.removeEventListener('storage', this.handleAuthUpdate);
      window.removeEventListener('resize', this.updateFavoriteColumnCount);
    }
  },
  mounted() {
    this.updateFavoriteColumnCount();
    this.loadProducts();
  }
};
</script>

<style scoped src="@/assets/styles/wishlist/FavoritesList.css"></style>
