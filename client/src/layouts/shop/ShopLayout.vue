<template>
  <div class="shop-layout">
    <StoreHeader
      :show-mega-menu-backdrop="showMegaMenuBackdrop"
      :is-header-scrolled="isHeaderScrolled"
      :brand-link="brandLink"
      :logo-src="logoSrc"
      :show-department-navigation="showDepartmentNavigation"
      :department-links="departmentLinks"
      :department-route="departmentRoute"
      :should-highlight-department="shouldHighlightDepartment"
      :show-search-action="showSearchAction"
      :is-search-drawer-open="isSearchDrawerOpen"
      :search-query="searchQuery"
      :is-admin="isAdmin"
      :current-user="currentUser"
      :favorites-link="favoritesLink"
      :cart-link="cartLink"
      :cart-count="cartCount"
      :format-currency="formatCurrency"
      :is-authenticated="isAuthenticated"
      :is-menu-open="isMenuOpen"
      :hovered-department="hoveredDepartment"
      :nav-collections="navCollections"
      :department-categories="departmentCategories"
      :department-category-route="departmentCategoryRoute"
      :format-category-label="formatCategoryLabel"
      :department-shortcut-links="departmentShortcutLinks"
      :department-collection-route="departmentCollectionRoute"
      :mega-menu-sections="megaMenuSections"
      :mega-menu-product-shelf="megaMenuProductShelf"
      :promo-hot-summer-route="hotSummerCollectionRoute"
      :promo-sale-route="seasonalSaleRoute"
      :promo-sale-label="seasonalSaleLabel"
      :promo-essential-route="essentialCollectionRoute"
      @open-department-menu="openDepartmentMenu"
      @schedule-department-menu-close="scheduleDepartmentMenuClose"
      @open-search-drawer="openSearchDrawer"
      @open-auth-modal="openAuthModal"
      @toggle-menu="toggleMenu"
      @close-department-menu="closeDepartmentMenu"
      @close-menu="closeMenu"
      @request-logout="requestLogout"
    />
    <SalePromoStrip :sale-route="seasonalSaleRoute" :discount-percent="seasonalSaleDiscountPercent" />
    <main
      class="page-shell"
      :class="{
        'page-shell--management': isManagementShell,
        'page-shell--dimmed': showMegaMenuBackdrop
      }"
    >
      <FlashMessages class="my-flash" />
      <router-view v-slot="{ Component, route }">
        <transition name="page" mode="out-in">
          <keep-alive include="ShopPage">
            <component :is="Component" :key="routeViewKey(route)" />
          </keep-alive>
        </transition>
      </router-view>
    </main>

    <SiteFooter :visible="!isManagementShell" :dimmed="showMegaMenuBackdrop" />

    <AuthModal
      ref="authModal"
      :open="isAuthModalOpen"
      :mode="authMode"
      :message="authMessage"
      :is-submitting="isSubmitting"
      :email-form="authEmailForm"
      :login-form="loginForm"
      :register-form="registerForm"
      :forgot-form="forgotForm"
      @close="closeAuthModal"
      @set-mode="setAuthMode"
      @submit-email="submitEmailCheck"
      @submit-login="submitLogin"
      @submit-register="submitRegister"
      @submit-forgot="submitForgotPassword"
      @submit-resend="submitResendVerification"
      @update-form-field="updateAuthFormField"
    />

    <transition name="cart-notice">
      <aside v-if="recentCartItem" class="cart-add-notice" aria-live="polite">
        <ProductVisual :product="recentCartItem" :color="recentCartItem.color || recentCartItem.colorName || recentCartItem.color_name" compact />
        <div class="cart-add-notice__content">
          <p class="eyebrow cart-add-notice__eyebrow">Added to bag</p>
          <strong class="cart-add-notice__name">{{ recentCartItem.name }}</strong>
          <span class="cart-add-notice__variant">{{ cartItemVariantLabel(recentCartItem) }}</span>
          <span class="cart-add-notice__price">
            <small
              v-if="cartItemPriceLabel(recentCartItem)"
              class="cart-add-notice__price-label"
              :class="`price-label--${itemPriceTone(recentCartItem)}`"
            >{{ cartItemPriceLabel(recentCartItem) }}</small>
            <span>{{ recentCartItem.quantity }} x</span>
            <strong class="price-current" :class="`price-current--${itemPriceTone(recentCartItem)}`">
              {{ formatCurrency(cartItemPrice(recentCartItem)) }}
            </strong>
            <span
              v-if="cartItemHasComparePrice(recentCartItem)"
              class="cart-add-notice__price-compare price-compare price-compare--sale"
            >{{ formatCurrency(cartItemComparePrice(recentCartItem)) }}</span>
          </span>
        </div>
      </aside>
    </transition>

    <transition name="cart-notice">
      <aside v-if="favoriteNotice.item" class="cart-add-notice favorite-add-notice" aria-live="polite">
        <ProductVisual
          :product="favoriteNotice.item"
          :color="favoriteNotice.item.color || favoriteNotice.item.colorName || favoriteNotice.item.color_name || favoriteNotice.item.primaryColor"
          compact
        />
        <div class="cart-add-notice__content">
          <p class="eyebrow cart-add-notice__eyebrow">
            {{ favoriteNotice.isFavorite ? 'Added to favorites' : 'Removed from favorites' }}
          </p>
          <strong class="cart-add-notice__name">{{ favoriteNotice.item.name }}</strong>
          <span v-if="favoriteNoticeColor" class="cart-add-notice__variant">{{ favoriteNoticeColor }}</span>
        </div>
      </aside>
    </transition>

    <transition name="back-to-top">
      <button
        v-if="showBackToTop"
        type="button"
        class="shop-back-to-top"
        aria-label="Back to top"
        @click="scrollToTop"
      >
        <span>Back to top</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 15l6-6 6 6" />
          <path d="M6 9l6-6 6 6" />
        </svg>
      </button>
    </transition>

    <LogoutConfirmDialog
      :open="isLogoutConfirmOpen"
      :logout-confirm-context="logoutConfirmContext"
      :logout-confirm-copy="logoutConfirmCopy"
      @close="closeLogoutConfirm"
      @confirm="confirmLogout"
    />

    <SearchDrawer
      ref="searchDrawer"
      :is-open="isSearchDrawerOpen"
      :search-query="searchQuery"
      :is-search-loading="isSearchLoading"
      :search-suggestions="searchSuggestions"
      :search-history="searchHistory"
      :format-search-date="formatSearchDate"
      @close="closeSearchDrawer"
      @submit-search="submitSearch"
      @search-input="handleSearchInput"
      @search-composition-start="handleSearchCompositionStart"
      @search-composition="handleSearchComposition"
      @search-composition-end="handleSearchCompositionEnd"
      @select-search-suggestion="selectSearchSuggestion"
      @clear-search-history="clearSearchHistory"
      @run-search-history="runSearchHistory"
    />
  </div>
</template>

<script>
import { shopLayoutMethods } from "../../controllers/layout/shopLayoutMethods";
import AuthModal from '../../components/auth/AuthModal.vue';
import FlashMessages from '../../components/common/FlashMessages.vue';
import SiteFooter from '../../components/layout/Footer.vue';
import LogoutConfirmDialog from '../../components/layout/LogoutConfirmDialog.vue';
import SalePromoStrip from '../../components/layout/SalePromoStrip.vue';
import SearchDrawer from '../../components/layout/SearchDrawer.vue';
import StoreHeader from '../../components/layout/StoreHeader.vue';
import ProductVisual from '../../components/product/ProductVisual.vue';
import { AUTH_MODAL_REQUEST_EVENT, authStore } from '../../stores/authStore';
import { cartStore } from '../../stores/cartStore';
import { favoriteNoticeState } from '../../stores/favoriteNoticeStore';
import { normalizeSearchText } from '../../helpers/shop/shopLayoutSearch';
import {
  getCachedProductSearchIndex,
  normalizeProductSearchValue,
  searchProductIndex
} from '../../helpers/shop/productSearchScoring';

const LOGO_SRC = `${import.meta.env.BASE_URL}hem-logo.svg`;

const DEPARTMENT_LINKS = [
  { key: 'women', label: 'Women' },
  { key: 'men', label: 'Men' },
  { key: 'sale', label: 'Sale' },
  { key: 'collections', label: 'Collections' }
];

const HEADER_COPY = {
  women: {
    title: 'Minimal women essentials.',
    subtitle: 'Clean shapes, soft layers, easy styling.'
  },
  men: {
    title: 'Relaxed men everyday wear.',
    subtitle: 'Simple pieces with sharp, easy structure.'
  }
};

const MEGA_MENU_COPY = {
  women: {
    title: 'Women edit',
    campaign: 'Fresh silhouettes for everyday modern dressing.'
  },
  men: {
    title: 'Men edit',
    campaign: 'Relaxed essentials with clean collection structure.'
  }
};

const MIN_SEARCH_PREVIEW_LENGTH = 2;
const SUGGESTION_LIMITS = {
  products: 8,
  categories: 4,
  collections: 2,
  keywords: 3
};
const DEFAULT_SUGGESTION_LIMITS = {
  products: 8,
  categories: 3
};

const routeSignature = route => {
  if (!route || typeof route !== 'object') return '';
  const query = route.query && typeof route.query === 'object' ? route.query : {};
  const queryString = Object.keys(query)
    .sort()
    .map(key => `${key}:${query[key]}`)
    .join('|');

  return `${route.path || ''}?${queryString}`;
};

const uniqueSuggestionBy = (items, selector) => {
  const seen = new Set();
  return items.filter(item => {
    const key = selector(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const numericPrice = value => {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : 0;
};

const productDiscountPercent = product => {
  const explicitDiscount = Number(
    product && (
      product.saleDiscountPercent ??
      product.sale_discount_percent ??
      product.discountPercent ??
      product.discount_percent
    )
  );

  if (Number.isFinite(explicitDiscount) && explicitDiscount > 0) {
    return Math.ceil(explicitDiscount);
  }

  const comparePrice = numericPrice(
    product && (
      product.listingComparePrice ??
      product.listing_compare_price ??
      product.originalPrice ??
      product.original_price ??
      product.comparePrice ??
      product.compare_price
    )
  );
  const salePrice = numericPrice(
    product && (
      product.listingPrice ??
      product.listing_price ??
      product.salePrice ??
      product.sale_price ??
      product.price
    )
  );

  return comparePrice > salePrice && salePrice > 0
    ? Math.ceil(((comparePrice - salePrice) / comparePrice) * 100)
    : 0;
};

const collectionRouteByKeyword = (collections, keywords, fallbackSlug) => {
  const normalizedKeywords = (Array.isArray(keywords) ? keywords : [keywords])
    .map(value => normalizeSearchText(value))
    .filter(Boolean);
  const matchedCollection = (Array.isArray(collections) ? collections : []).find(collection => {
    const haystack = normalizeSearchText([
      collection && collection.slug,
      collection && collection.name,
      collection && collection.label
    ].filter(Boolean).join(' '));

    return normalizedKeywords.some(keyword => haystack.includes(keyword));
  });
  const slug = String(
    matchedCollection && (matchedCollection.slug || matchedCollection.name || matchedCollection.label) ||
    fallbackSlug ||
    ''
  ).trim();

  return {
    path: `/collections/${encodeURIComponent(slug)}`
  };
};

const scoreDefaultProductSuggestion = entry => {
  const product = entry.product || {};
  const soldCount = Number(product.soldCount ?? product.sold_count ?? 0);
  const reviewCount = Number(product.reviews ?? product.reviewCount ?? product.review_count ?? 0);
  const rating = Number(product.rating ?? 0);

  return (
    Math.min(Math.max(soldCount, 0), 1200) +
    Math.min(Math.max(reviewCount, 0), 800) * 0.35 +
    (Number.isFinite(rating) ? rating * 45 : 0)
  );
};

const scoreNavigationSuggestion = (entry, term) => {
  const labelText = normalizeSearchText(entry.label);
  const searchText = normalizeSearchText(entry.searchText || '');
  const normalizedMatches = (entry.matchValues || []).map(value => normalizeSearchText(value)).filter(Boolean);
  const labelTokens = labelText.split(' ').filter(Boolean);
  const matchTokens = normalizedMatches.flatMap(value => value.split(' ').filter(Boolean));
  const hasPhraseMatch = searchText.includes(term);
  const hasTokenMatch = matchTokens.some(token => token.startsWith(term) || token.includes(term));

  if (!hasPhraseMatch && !hasTokenMatch) {
    return 0;
  }

  let score = 0;

  if (labelText === term) score += 100;
  else if (labelText.startsWith(term)) score += 70;
  else if (labelText.includes(term)) score += 40;

  if (labelTokens.some(token => token.startsWith(term))) score += 30;
  else if (matchTokens.some(token => token.startsWith(term))) score += 20;
  else if (hasTokenMatch) score += 12;

  if (normalizedMatches.some(value => value === term)) score += 40;
  if (entry.type === 'category') score += 10;
  if (entry.type === 'collection') score += 8;

  return score;
};

const isReasonableCollectionMatch = (entry, term) =>
  (entry.matchValues || [])
    .map(value => normalizeSearchText(value))
    .some(value => value && value !== 'collection' && value !== 'collections' && (value.includes(term) || term.includes(value)));

const navigationEntryMatchesProduct = (entry, product) => {
  if (!entry || !product) return false;
  const entryLabel = normalizeProductSearchValue(entry.label);

  if (entry.type === 'category') {
    return [product.category, product.categoryLabel, product.categorySlug]
      .map(normalizeProductSearchValue)
      .some(value => value && value === entryLabel);
  }

  if (entry.type === 'collection') {
    return [product.collection, product.collectionLabel, product.collectionSlug]
      .map(normalizeProductSearchValue)
      .some(value => value && value === entryLabel);
  }

  return false;
};

const addKeywordCandidate = (candidates, value, term) => {
  const rawValue = String(value || '').trim();

  if (rawValue.includes('/')) return;

  const displayValue = rawValue.replace(/[-_]+/g, ' ');
  const normalized = normalizeSearchText(displayValue);
  if (!normalized || normalized.length < MIN_SEARCH_PREVIEW_LENGTH || normalized.length > 28) return;
  if (normalized.split(' ').some(token => token === 'men' || token === 'women')) return;
  if (!normalized.includes(term) && !normalized.split(' ').some(token => token.startsWith(term))) return;
  const isPluralCandidate = normalized.endsWith('s') && !normalized.endsWith('ss');
  const singularCandidates = [
    normalized.endsWith('es') ? normalized.slice(0, -2) : '',
    isPluralCandidate ? normalized.slice(0, -1) : ''
  ].filter(Boolean);

  if (singularCandidates.some(candidate => candidates.has(candidate))) return;

  if (!isPluralCandidate) {
    candidates.delete(`${normalized}s`);
    candidates.delete(`${normalized}es`);
  }

  if (!candidates.has(normalized)) {
    candidates.set(normalized, displayValue);
  }
};

const buildKeywordSuggestionEntries = (term, productEntries, categoryEntries) => {
  const candidates = new Map();

  [...productEntries, ...categoryEntries].forEach(entry => {
    const product = entry.product || {};
    const values = [
      product.categoryLabel,
      product.category,
      product.productGroupLabel,
      product.styleName,
      ...(Array.isArray(product.materialFilterValues) ? product.materialFilterValues : []),
      ...(entry.matchValues || [])
    ];

    values.forEach(value => addKeywordCandidate(candidates, value, term));

    normalizeSearchText(product.name)
      .split(' ')
      .filter(Boolean)
      .forEach((token, index, tokens) => {
        addKeywordCandidate(candidates, token, term);
        if (tokens[index + 1]) addKeywordCandidate(candidates, `${token} ${tokens[index + 1]}`, term);
      });
  });

  return [...candidates.entries()]
    .sort((left, right) => left[0].length - right[0].length || left[0].localeCompare(right[0]))
    .slice(0, SUGGESTION_LIMITS.keywords)
    .map(([normalized, label]) => ({
      key: `keyword-${normalized}`,
      type: 'keyword',
      label,
      meta: '',
      route: {
        path: '/search',
        query: { q: label }
      }
    }));
};

export default {
  name: 'ShopLayout',
  components: { AuthModal, FlashMessages, LogoutConfirmDialog, ProductVisual, SalePromoStrip, SearchDrawer, SiteFooter, StoreHeader },
  data() {
    const session = authStore.getSession();
    const isCustomer = Boolean(session.token && session.user && session.user.role !== 'admin');

    return {
      cartCount: isCustomer ? cartStore.countItems() : 0,
      cartItems: isCustomer ? cartStore.getItems() : [],
      session,
      searchQuery: '',
      searchPreviewQuery: '',
      searchPreviewTimer: null,
      isSearchComposing: false,
      searchHistory: [],
      isSearchDrawerOpen: false,
      isSearchLoading: false,
      isMenuOpen: false,
      isLogoutConfirmOpen: false,
      logoutConfirmContext: 'shop',
      recentCartItem: null,
      cartNoticeTimer: null,
      favoriteNotice: favoriteNoticeState,
      departmentLinks: DEPARTMENT_LINKS,
      navDepartments: [],
      hoveredDepartment: '',
      authMode:
        this.$route.query.auth === 'email'
          ? 'email'
          : this.$route.query.auth === 'register'
            ? 'register'
            : this.$route.query.auth === 'forgot'
              ? 'forgot'
              : this.$route.query.auth === 'verify'
                ? 'verify'
                : this.$route.query.auth === 'login'
                  ? 'login'
                  : '',
      authMessage: '',
      pendingAuthAction: null,
      isSubmitting: false,
      authEmailForm: { email: '' },
      loginForm: { email: '', password: '' },
      registerForm: { name: '', email: '', password: '', confirmPassword: '', birthDate: '', birthDatePicker: '', fullName: '', showOptional: false },
      forgotForm: { email: '' },
      departmentMenuTimer: null,
	      navCollections: [],
	      searchProducts: [],
	      logoSrc: LOGO_SRC,
	      isHeaderScrolled: false,
      showBackToTop: false
	    };
  },
  computed: {
    favoriteNoticeColor() {
      const item = this.favoriteNotice.item || {};
      const firstColor = Array.isArray(item.colors) ? item.colors[0] : null;

      return String(
        item.color ||
        item.colorName ||
        item.color_name ||
        item.selectedColor ||
        item.primaryColor ||
        (firstColor && (firstColor.colorName || firstColor.color_name || firstColor.name)) ||
        ''
      ).trim();
    },
    currentUser() {
      return this.session.user || { name: '', role: 'guest' };
    },
    isAuthenticated() {
      return Boolean(this.session.token && this.session.user);
    },
    isAdmin() {
      return this.isAuthenticated && this.currentUser.role === 'admin';
    },
    isUser() {
      return this.isAuthenticated && this.currentUser.role !== 'admin';
    },
    isUtilityPage() {
      return ['/checkout', '/cart', '/favorites'].includes(this.$route.path) || this.$route.path.startsWith('/profile');
    },
	    isStandaloneCustomerPage() {
	      return ['/cart', '/favorites', '/checkout', '/search'].includes(this.$route.path) || this.$route.path.startsWith('/profile');
	    },
    isAdminRoute() {
      const matchedRecords = this.$route && Array.isArray(this.$route.matched) ? this.$route.matched : [];
      return (
        this.$route.path.startsWith('/studio') ||
        this.$route.path === '/admin' ||
        matchedRecords.some(record => record.meta && (record.meta.requiresAdmin || record.meta.adminLayout))
      );
    },
    isManagementShell() {
      return false;
    },
    isAuthModalOpen() {
      return !this.isAuthenticated && ['email', 'login', 'register', 'forgot', 'verify'].includes(this.authMode);
    },
    showMegaMenuBackdrop() {
      return !this.isManagementShell && this.$route.path !== '/checkout' && Boolean(this.hoveredDepartment);
    },
    brandLink() {
      return '/women';
    },
	    activeDepartment() {
	      if (this.$route.path === '/search') {
	        const searchDepartment = String(this.$route.query.department || '').toLowerCase();
	        if (searchDepartment === 'men') return 'men';
	        if (searchDepartment === 'women') return 'women';
	      }
	      if (String(this.$route.query.department || '').toLowerCase() === 'men') return 'men';
	      return this.$route.path.startsWith('/men') ? 'men' : 'women';
	    },
    highlightedDepartment() {
      return this.hoveredDepartment || this.activeDepartment;
    },
    activeDepartmentLabel() {
      if (this.$route.path === '/cart') return 'Cart';
      if (this.$route.path === '/favorites') return 'Favorites';
      if (this.$route.path === '/checkout') return 'Checkout';
      if (this.$route.path.startsWith('/profile/orders')) return 'Orders';
      return this.activeDepartment === 'men' ? 'Men' : 'Women';
    },
    seasonalSaleRoute() {
      return {
        path: '/sale',
        query: { department: this.activeDepartment }
      };
    },
    seasonalSaleDiscountPercent() {
      const discounts = (Array.isArray(this.searchProducts) ? this.searchProducts : [])
        .map(productDiscountPercent)
        .filter(percent => percent > 0);

      return discounts.length ? Math.max(...discounts) : 50;
    },
    seasonalSaleLabel() {
      return `Sale up to ${this.seasonalSaleDiscountPercent}%`;
    },
    hotSummerCollectionRoute() {
      return collectionRouteByKeyword(this.navCollections, ['summer'], 'summer-2026');
    },
    essentialCollectionRoute() {
      return collectionRouteByKeyword(this.navCollections, ['essential', 'essentials'], 'essentials');
    },
    activeMegaMenuLabel() {
      if (this.hoveredDepartment === 'sale') return 'Sale';
      if (this.hoveredDepartment === 'collections') return 'Collections';
      return this.hoveredDepartment === 'men' ? 'Men' : 'Women';
    },
    activeMegaMenuTitle() {
      const department = this.hoveredDepartment === 'men' ? 'men' : 'women';
      return MEGA_MENU_COPY[department].title;
    },
    currentRouteSearchQuery() {
      return String(this.$route.query.q || '').trim();
    },
    showDepartmentNavigation() {
      return !this.isAdminRoute;
    },
    showSearchAction() {
      return true;
    },
    logoutConfirmCopy() {
      if (this.logoutConfirmContext === 'admin') {
        return {
          eyebrow: 'Studio logout',
          title: 'Leave HEM Studio?',
          message: 'You will be signed out of the admin dashboard.',
          cancel: 'Stay in Studio',
          confirm: 'Logout'
        };
      }

      return {
        eyebrow: 'Sign out',
        title: 'Sign out of your account?',
        message: 'You will be signed out of your HEM account on this device.',
        cancel: 'Stay signed in',
        confirm: 'Sign out'
      };
    },
    headerTitle() {
      if (this.$route.path === '/cart') return 'Your shopping bag.';
      if (this.$route.path === '/favorites') return 'Your favorites list.';
      if (this.$route.path === '/checkout') return 'Secure checkout.';
      if (this.$route.path.startsWith('/profile/orders')) return 'Your orders.';
      return HEADER_COPY[this.activeDepartment].title;
    },
    headerSubtitle() {
      if (this.$route.path === '/cart') return 'Review your items, update quantities, and continue to checkout.';
      if (this.$route.path === '/favorites') return 'Saved products stay here until you are ready to buy them.';
      if (this.$route.path === '/checkout') return 'Add shipping details, choose payment, and place your order.';
      if (this.$route.path.startsWith('/profile/orders')) return 'Track purchases, delivery status, and order details.';
      return HEADER_COPY[this.activeDepartment].subtitle;
    },
    favoritesLink() {
      return { path: '/favorites' };
    },
    cartLink() {
      return { path: '/cart' };
    },
    productSearchIndex() {
      return getCachedProductSearchIndex(this.searchProducts);
    },
    searchEntries() {
      return this.buildSearchEntries();
    },
    searchProductEntriesById() {
      return new Map(
        this.searchEntries
          .filter(entry => entry && entry.type === 'product' && entry.product)
          .map(entry => [String(entry.product.id || entry.product.slug), entry])
      );
    },
    searchNavigationEntries() {
      return this.searchEntries.filter(entry => entry && ['category', 'collection'].includes(entry.type));
    },
    searchSuggestions() {
      const normalizedTerm = normalizeProductSearchValue(this.searchPreviewQuery);
      const entries = this.searchEntries;

      if (!normalizedTerm) {
        const defaultEntries = entries.filter(entry => entry && entry.isDefault);
        const categoryEntries = uniqueSuggestionBy(
          defaultEntries.filter(entry => entry.type === 'category'),
          entry => routeSignature(entry.route)
        ).slice(0, DEFAULT_SUGGESTION_LIMITS.categories);
        const productEntries = uniqueSuggestionBy(
          entries
            .filter(entry => entry.type === 'product')
            .map(entry => ({
              ...entry,
              score: scoreDefaultProductSuggestion(entry)
            }))
            .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label)),
          entry => String((entry.product && (entry.product.id || entry.product.slug)) || routeSignature(entry.route))
        ).slice(0, DEFAULT_SUGGESTION_LIMITS.products);

        return [
          ...categoryEntries,
          ...productEntries
        ];
      }

      if (normalizedTerm.length < MIN_SEARCH_PREVIEW_LENGTH) {
        return [];
      }

      const productResults = searchProductIndex(this.productSearchIndex, normalizedTerm, {
        limit: SUGGESTION_LIMITS.products
      });
      const productEntries = productResults.map(result => {
        const key = String(result.product.id || result.product.slug);
        const sourceEntry = this.searchProductEntriesById.get(key) || {};

        return {
          ...sourceEntry,
          key: sourceEntry.key || `product-${key}`,
          type: 'product',
          label: result.product.name,
          product: result.product,
          score: result.score
        };
      });
      const navigationEntries = this.searchNavigationEntries
        .filter(entry => productResults.some(result => navigationEntryMatchesProduct(entry, result.product)))
        .map(entry => ({
          ...entry,
          score: scoreNavigationSuggestion(entry, normalizedTerm)
        }))
        .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label));
      const categoryEntries = uniqueSuggestionBy(
        navigationEntries.filter(entry => entry.type === 'category'),
        entry => routeSignature(entry.route)
      ).slice(0, SUGGESTION_LIMITS.categories);
      const collectionEntries = uniqueSuggestionBy(
        navigationEntries.filter(entry => entry.type === 'collection' && isReasonableCollectionMatch(entry, normalizedTerm)),
        entry => routeSignature(entry.route)
      ).slice(0, SUGGESTION_LIMITS.collections);
      const keywordEntries = buildKeywordSuggestionEntries(normalizedTerm, productEntries, categoryEntries);

      return [
        ...categoryEntries,
        ...collectionEntries,
        ...keywordEntries,
        ...productEntries
      ];
    }
  },
  watch: {
    'favoriteNotice.item'(item) {
      if (!item) return;
      this.recentCartItem = null;
      if (this.cartNoticeTimer) clearTimeout(this.cartNoticeTimer);
    },
    '$route.fullPath'(nextPath, previousPath) {
      this.syncRouteShellClass();
      this.syncSearchFromRoute();
      const isProfilePanelChange =
        String(nextPath || '').startsWith('/profile') &&
        String(previousPath || '').startsWith('/profile');

      if (!this.isAdminRoute && !isProfilePanelChange) {
        this.loadNavigationProducts();
        this.refreshCart();
        this.refreshFavorites();
      }
      this.authMode =
        this.$route.query.auth === 'email'
          ? 'email'
          : this.$route.query.auth === 'register'
            ? 'register'
            : this.$route.query.auth === 'forgot'
              ? 'forgot'
              : this.$route.query.auth === 'verify'
                ? 'verify'
                : this.$route.query.auth === 'login'
                ? 'login'
                : '';
      if (!this.authMode && !this.isAuthenticated) {
        this.clearPendingAuthAction();
      }
      this.closeDepartmentMenu();
      this.closeMenu();
      this.closeSearchDrawer();
    },
    isAuthModalOpen() {
      this.syncBodyScrollLock();
    },
    isSearchDrawerOpen() {
      this.syncBodyScrollLock();
    },
    isLogoutConfirmOpen() {
      this.syncBodyScrollLock();
    }
  },
  created() {
    this.handleCartUpdate = event => {
      if (!this.isUser) {
        this.cartCount = 0;
        this.cartItems = [];
        return;
      }

      this.cartCount = cartStore.countItems();
      this.cartItems = cartStore.getItems();

      const addedItem = event && event.detail ? event.detail.addedItem : null;
      const silentNotice = Boolean(event && event.detail && event.detail.silentNotice);

      if (addedItem && !silentNotice) {
        window.setTimeout(() => {
          this.showCartNotice(addedItem);
        }, 0);
      }
    };
    this.handleAuthUpdate = () => {
      this.session = authStore.getSession();
      if (!this.isAdminRoute) {
        this.refreshCart();
        this.refreshFavorites();
      }

      if (!this.isUser) {
        this.searchHistory = [];
        this.closeSearchDrawer();
      }

      const matchedRecords = this.$route ? this.$route.matched : [];
      const requiresUser = matchedRecords.some(record => record.meta.requiresUser);
      const requiresAdmin = matchedRecords.some(record => record.meta.requiresAdmin);

      if (!this.isAuthenticated && requiresAdmin) {
        this.$router.push({ path: this.currentStorePath(), query: { auth: 'email', redirect: this.$route.fullPath } });
        return;
      }

      if (!this.isAuthenticated && requiresUser) {
        this.$router.push({ path: this.currentStorePath(), query: { auth: 'email', redirect: this.$route.fullPath } });
        return;
      }

      if (requiresUser && !this.isAuthenticated) {
        this.$router.push({ path: this.currentStorePath(), query: { auth: 'email', redirect: this.$route.fullPath } });
      }
    };
    this.handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth > 960) this.isMenuOpen = false;
    };
    this.handleScroll = () => {
      if (typeof window === 'undefined') return;
      this.isHeaderScrolled = window.scrollY > 12;
      this.showBackToTop = window.scrollY > Math.max(window.innerHeight * 0.65, 420);
    };
    this.handleKeydown = event => {
      if (event.key === 'Escape' && this.isAuthModalOpen) this.closeAuthModal();
      if (event.key === 'Escape' && this.hoveredDepartment) this.closeDepartmentMenu();
      if (event.key === 'Escape' && this.isSearchDrawerOpen) this.closeSearchDrawer();
      if (event.key === 'Escape' && this.isLogoutConfirmOpen) this.closeLogoutConfirm();
    };
    this.handleLogoutConfirmRequest = () => {
      this.requestLogout();
    };
    this.handleAuthModalRequest = event => {
      this.openAuthModal(event && event.detail ? event.detail : 'email');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('cart-updated', this.handleCartUpdate);
      window.addEventListener('auth-updated', this.handleAuthUpdate);
      window.addEventListener('storage', this.handleCartUpdate);
      window.addEventListener('storage', this.handleAuthUpdate);
      window.addEventListener('resize', this.handleResize);
      window.addEventListener('keydown', this.handleKeydown);
      window.addEventListener('scroll', this.handleScroll, { passive: true });
      window.addEventListener('request-logout-confirm', this.handleLogoutConfirmRequest);
      window.addEventListener(AUTH_MODAL_REQUEST_EVENT, this.handleAuthModalRequest);
    }

    this.syncRouteShellClass();
    this.handleScroll();
    if (!this.isAdminRoute) {
      this.syncSearchFromRoute();
      this.loadNavigationProducts();
      this.refreshCart();
      this.refreshFavorites();
    }
  },
  beforeUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('cart-updated', this.handleCartUpdate);
      window.removeEventListener('auth-updated', this.handleAuthUpdate);
      window.removeEventListener('storage', this.handleCartUpdate);
      window.removeEventListener('storage', this.handleAuthUpdate);
      window.removeEventListener('resize', this.handleResize);
      window.removeEventListener('keydown', this.handleKeydown);
      window.removeEventListener('scroll', this.handleScroll);
      window.removeEventListener('request-logout-confirm', this.handleLogoutConfirmRequest);
      window.removeEventListener(AUTH_MODAL_REQUEST_EVENT, this.handleAuthModalRequest);
    }

    if (this.departmentMenuTimer) clearTimeout(this.departmentMenuTimer);
    if (this.cartNoticeTimer) clearTimeout(this.cartNoticeTimer);
    if (this.searchPreviewTimer) clearTimeout(this.searchPreviewTimer);
    this.syncRouteShellClass(false);
    this.syncBodyScrollLock(false);
  },
  methods: shopLayoutMethods
};
</script>

<style src="@/assets/styles/layout/shop/ShopLayout.css"></style>
