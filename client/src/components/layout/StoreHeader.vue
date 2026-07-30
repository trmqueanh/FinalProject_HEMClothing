<template>
  <header
    class="store-header"
    :class="{
      'store-header--menu-open': showMegaMenuBackdrop,
      'store-header--scrolled': isHeaderScrolled
    }"
  >
    <div class="store-header__inner">
      <div class="store-header__left">
        <router-link :to="brandLink" class="brand-lockup" aria-label="HEM Women">
          <img :src="logoSrc" alt="HEM logo" class="brand-lockup__logo" />
        </router-link>
      </div>

      <div
        class="store-promo"
        :aria-label="promoAriaLabel"
      >
        <div class="store-promo__inner">
          <div class="store-promo__viewport">
            <div class="store-promo__track">
              <div
                v-for="copyIndex in 6"
                :key="`promo-copy-${copyIndex}`"
                class="store-promo__group"
                :aria-hidden="copyIndex > 1 ? 'true' : undefined"
              >
                <template v-for="item in promoItems" :key="`promo-${copyIndex}-${item.icon}`">
                  <span class="store-promo__item">
                    <svg v-if="item.icon === 'shipping'" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 7h11v8H3z" />
                      <path d="M14 10h3l3 3v2h-6z" />
                      <circle cx="7" cy="18" r="1.6" />
                      <circle cx="17" cy="18" r="1.6" />
                    </svg>
                    <svg v-else-if="item.icon === 'delivery'" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M13 2 5 14h6l-1 8 9-13h-6z" />
                    </svg>
                    <svg v-else-if="item.icon === 'returns'" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8 7h8a5 5 0 1 1-4.6 7" />
                      <path d="M8 7l3-3M8 7l3 3" />
                    </svg>
                    <svg v-else-if="item.icon === 'payment'" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 3 2.8 20h18.4z" />
                      <path d="M12 8v5" />
                      <circle cx="12" cy="16.5" r=".8" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 5h7l9 9-6 6-9-9z" />
                      <circle cx="8.5" cy="8.5" r="1.2" />
                    </svg>
                    <span class="store-promo__copy">
                      <template v-for="(segment, segmentIndex) in item.segments" :key="`${item.icon}-${segmentIndex}`">
                        <strong v-if="segment.keyword">{{ segment.text }}</strong>
                        <span v-else>{{ segment.text }}</span>
                      </template>
                    </span>
                  </span>
                  <span class="store-promo__separator" aria-hidden="true">•</span>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        v-if="showSearchAction"
        type="button"
        class="store-action--search-pill"
        :aria-expanded="isSearchDrawerOpen ? 'true' : 'false'"
        aria-label="Search"
        @click="$emit('open-search-drawer')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6" />
          <path d="M20 20l-4.2-4.2" />
        </svg>
        <span :class="{ 'store-action--search-pill__text--active': hasSearchQuery }">{{ searchActionLabel }}</span>
      </button>

      <div class="store-header__right">
        <div class="store-actions">
          <router-link
            v-if="isAdmin"
            to="/studio"
            class="store-action-labeled store-action-labeled--studio"
            aria-label="Back to Studio dashboard"
            title="Back to Studio"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4" y="4" width="6" height="6" rx="1.2" />
              <rect x="14" y="4" width="6" height="6" rx="1.2" />
              <rect x="4" y="14" width="6" height="6" rx="1.2" />
              <rect x="14" y="14" width="6" height="6" rx="1.2" />
            </svg>
            <span>Studio</span>
          </router-link>

          <router-link to="/profile/orders" class="store-action-labeled store-action-labeled--orders" aria-label="Order lookup">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 4h14v16H5z" />
              <path d="M8 8h8M8 12h5" />
              <circle cx="16.5" cy="16.5" r="2.5" />
            </svg>
            <span>Order Lookup</span>
          </router-link>

          <router-link v-if="isAuthenticated" :to="cartLink" class="store-action-labeled store-action-labeled--cart" aria-label="Cart">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 4h2l2.2 10.1c.1.5.5.9 1 .9h8.9c.5 0 .9-.3 1-.8L22 7H7" />
              <circle cx="10" cy="19" r="1.6" />
              <circle cx="18" cy="19" r="1.6" />
            </svg>
            <span>Cart</span>
            <small v-if="cartCount" class="store-action__badge store-action__badge--cart">{{ cartCount }}</small>
          </router-link>

          <button
            v-else
            type="button"
            class="store-action-labeled store-action-labeled--cart"
            aria-label="Cart"
            @click="$emit('open-auth-modal', 'email')"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 4h2l2.2 10.1c.1.5.5.9 1 .9h8.9c.5 0 .9-.3 1-.8L22 7H7" />
              <circle cx="10" cy="19" r="1.6" />
              <circle cx="18" cy="19" r="1.6" />
            </svg>
            <span>Cart</span>
          </button>

          <button
            type="button"
            class="store-action-labeled store-action--menu"
            :aria-expanded="isMenuOpen ? 'true' : 'false'"
            aria-label="Open menu"
            @click="$emit('toggle-menu')"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
            <span>Menu</span>
          </button>

          <button
            v-if="!isAuthenticated"
            type="button"
            class="account-login"
            aria-label="Sign in"
            @click="$emit('open-auth-modal', 'email')"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" />
              <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
            </svg>
            <span>Sign In</span>
          </button>

          <div
            v-else
            class="account-menu"
            :class="{ 'account-menu--closing': isAccountMenuClosing }"
            @mouseleave="isAccountMenuClosing = false"
          >
            <router-link
              to="/profile"
              class="account-menu__trigger"
              :aria-label="`Account: ${accountDisplayName}`"
              :title="accountDisplayName"
              @click="closeAccountMenu"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" />
                <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
              </svg>
              <span>{{ accountDisplayName }}</span>
            </router-link>

            <div class="account-menu__dropdown" role="menu" aria-label="Account menu">
              <strong class="account-menu__title">Account</strong>

              <router-link
                v-for="item in accountMenuLinks"
                :key="item.key"
                :to="item.route"
                class="account-menu__link"
                role="menuitem"
                @click="closeAccountMenu"
              >
                {{ item.label }}
              </router-link>

              <button type="button" class="account-menu__link account-menu__logout" role="menuitem" @click="requestLogout">
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showDepartmentNavigation" class="store-header__nav-row">
      <nav class="store-nav" aria-label="Store navigation">
        <div
          v-for="link in departmentLinks"
          :key="link.key"
          class="store-nav__item"
          @mouseenter="$emit('open-department-menu', link.key)"
          @mouseleave="$emit('schedule-department-menu-close')"
          @focusin="$emit('open-department-menu', link.key)"
        >
          <button
            v-if="link.key === 'collections'"
            type="button"
            class="store-nav__link store-nav__link--button"
            :class="{ 'store-nav__link--active': shouldHighlightDepartment(link.key) }"
            @click.prevent="$emit('open-department-menu', link.key)"
          >
            {{ link.label }}
          </button>
          <router-link
            v-else
            :to="departmentRoute(link.key)"
            class="store-nav__link"
            :class="{ 'store-nav__link--active': shouldHighlightDepartment(link.key) }"
          >
            {{ link.label }}
          </router-link>
        </div>
      </nav>

      <div class="store-nav-promos" aria-label="Sale shortcuts">
        <router-link :to="promoHotSummerRoute">Hot Summer</router-link>
        <router-link :to="promoSaleRoute">{{ promoSaleLabel }}</router-link>
        <router-link :to="promoEssentialRoute">Essential</router-link>
      </div>
    </div>

    <MegaMenu
      :show-mega-menu-backdrop="showMegaMenuBackdrop"
      :hovered-department="hoveredDepartment"
      :nav-collections="navCollections"
      :department-categories="departmentCategories"
      :department-category-route="departmentCategoryRoute"
      :format-category-label="formatCategoryLabel"
      :department-shortcut-links="departmentShortcutLinks"
      :department-collection-route="departmentCollectionRoute"
      :mega-menu-sections="megaMenuSections"
      :mega-menu-product-shelf="megaMenuProductShelf"
      @open-department-menu="$emit('open-department-menu', $event)"
      @schedule-close="$emit('schedule-department-menu-close')"
      @close="$emit('close-department-menu')"
    />

    <MobileMenu
      :is-menu-open="isMenuOpen"
      :show-department-navigation="showDepartmentNavigation"
      :department-links="departmentLinks"
      :favorites-link="favoritesLink"
      :cart-link="cartLink"
      :is-authenticated="isAuthenticated"
      :is-admin="isAdmin"
      :department-route="departmentRoute"
      :should-highlight-department="shouldHighlightDepartment"
      @close-menu="$emit('close-menu')"
      @open-auth-modal="$emit('open-auth-modal', $event)"
      @request-logout="$emit('request-logout')"
    />
  </header>
</template>

<script>
import { FREE_SHIPPING_THRESHOLD } from '../../helpers/cart/cartItemHelpers';
import MegaMenu from './MegaMenu.vue';
import MobileMenu from './MobileMenu.vue';

export default {
  name: 'StoreHeader',
  components: {
    MegaMenu,
    MobileMenu
  },
  data() {
    return {
      isAccountMenuClosing: false
    };
  },
  computed: {
    freeShippingThreshold() {
      return FREE_SHIPPING_THRESHOLD;
    },
    promoItems() {
      const items = [
        {
          icon: 'shipping',
          segments: [
            { text: 'Free shipping', keyword: true },
            { text: ' for orders ' },
            { text: `${this.formatCurrency(FREE_SHIPPING_THRESHOLD)}+`, keyword: true }
          ]
        },
        {
          icon: 'payment',
          segments: [
            { text: 'Only pay online through our ' },
            { text: 'website', keyword: true },
            { text: ', or use ' },
            { text: 'COD', keyword: true },
            { text: ' after receiving and inspecting your order' }
          ]
        },
        {
          icon: 'delivery',
          segments: [
            { text: 'Fast delivery', keyword: true },
            { text: ' within ' },
            { text: '24h', keyword: true }
          ]
        },
        {
          icon: 'returns',
          segments: [
            { text: 'Easy returns', keyword: true },
            { text: ' within ' },
            { text: '7 days', keyword: true }
          ]
        },
        {
          icon: 'deals',
          segments: [
            { text: 'New deals', keyword: true },
            { text: ' updated ' },
            { text: 'daily', keyword: true }
          ]
        }
      ];

      return items.map(item => ({
        ...item,
        text: item.segments.map(segment => segment.text).join('')
      }));
    },
    promoAriaLabel() {
      return this.promoItems.map(item => item.text).join('. ');
    },
    accountDisplayName() {
      const name = String(this.currentUser && (this.currentUser.name || this.currentUser.fullName || this.currentUser.email) || '').trim();
      if (!name) return 'there';
      return name.split(/\s+/)[0];
    },
    trimmedSearchQuery() {
      return String(this.searchQuery || '').trim();
    },
    hasSearchQuery() {
      return Boolean(this.trimmedSearchQuery);
    },
    searchActionLabel() {
      return this.hasSearchQuery ? this.trimmedSearchQuery : 'What are you shopping for today?';
    },
    accountMenuLinks() {
      const links = [
        { key: 'profile', label: 'Profile', route: { path: '/profile' } },
        { key: 'orders', label: 'Orders', route: { path: '/profile/orders' } },
        { key: 'favorites', label: 'Favorites', route: this.favoritesLink },
        { key: 'coupons', label: 'Coupons', route: { path: '/profile', query: { section: 'coupons' } } },
        { key: 'reviews', label: 'Reviews', route: { path: '/profile', query: { section: 'reviews' } } },
        { key: 'settings', label: 'Account Settings', route: { path: '/profile', query: { section: 'settings' } } }
      ];

      if (this.isAdmin) {
        links.splice(0, 0, { key: 'studio', label: 'Studio Dashboard', route: { path: '/studio' } });
      }

      return links;
    }
  },
  props: {
    showMegaMenuBackdrop: {
      type: Boolean,
      default: false
    },
    isHeaderScrolled: {
      type: Boolean,
      default: false
    },
    brandLink: {
      type: [String, Object],
      required: true
    },
    logoSrc: {
      type: String,
      default: ''
    },
    showDepartmentNavigation: {
      type: Boolean,
      default: true
    },
    departmentLinks: {
      type: Array,
      default: () => []
    },
    departmentRoute: {
      type: Function,
      required: true
    },
    shouldHighlightDepartment: {
      type: Function,
      required: true
    },
    showSearchAction: {
      type: Boolean,
      default: true
    },
    isSearchDrawerOpen: {
      type: Boolean,
      default: false
    },
    searchQuery: {
      type: String,
      default: ''
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    currentUser: {
      type: Object,
      default: () => ({})
    },
    favoritesLink: {
      type: [String, Object],
      required: true
    },
    cartLink: {
      type: [String, Object],
      required: true
    },
    cartCount: {
      type: Number,
      default: 0
    },
    formatCurrency: {
      type: Function,
      required: true
    },
    isAuthenticated: {
      type: Boolean,
      default: false
    },
    isMenuOpen: {
      type: Boolean,
      default: false
    },
    hoveredDepartment: {
      type: String,
      default: ''
    },
    navCollections: {
      type: Array,
      default: () => []
    },
    departmentCategories: {
      type: Function,
      required: true
    },
    departmentCategoryRoute: {
      type: Function,
      required: true
    },
    formatCategoryLabel: {
      type: Function,
      required: true
    },
    departmentShortcutLinks: {
      type: Function,
      required: true
    },
    departmentCollectionRoute: {
      type: Function,
      required: true
    },
    megaMenuSections: {
      type: Function,
      required: true
    },
    megaMenuProductShelf: {
      type: Function,
      required: true
    },
    promoHotSummerRoute: {
      type: [String, Object],
      default: () => ({ path: '/collections/summer-2026' })
    },
    promoSaleRoute: {
      type: [String, Object],
      default: () => ({ path: '/sale' })
    },
    promoSaleLabel: {
      type: String,
      default: 'Sale up to 50%'
    },
    promoEssentialRoute: {
      type: [String, Object],
      default: () => ({ path: '/collections/essentials' })
    }
  },
  emits: [
    'open-department-menu',
    'schedule-department-menu-close',
    'open-search-drawer',
    'open-auth-modal',
    'toggle-menu',
    'close-department-menu',
    'close-menu',
    'request-logout'
  ],
  methods: {
    closeAccountMenu() {
      this.isAccountMenuClosing = true;

      if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
    },
    requestLogout() {
      this.closeAccountMenu();
      this.$emit('request-logout');
    }
  }
};
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════
   STORE HEADER — Nike-style CSS
   Replace the entire <style scoped> block in StoreHeader.vue
═══════════════════════════════════════════════════════════════ */

/* ── Shell ── */
.store-header {
  --header-surface: var(--color-bg-canvas, #ffffff);
  --ink: #111111;
  --ink-muted: rgba(17,17,17,0.56);
  position: fixed;
  top: 0;
  left: 0;
  right: auto;
  z-index: 300;
  width: 100vw;
  max-width: none;
  height: var(--store-header-height);
  min-height: var(--store-header-height);
  margin: 0;
  isolation: isolate;
  background: var(--header-surface);
  border-bottom: 0;
  box-shadow: none;
  box-sizing: border-box;
  overflow: visible;
  transition: background 200ms ease, box-shadow 200ms ease, filter 180ms ease;
}

.store-header--scrolled {
  --header-surface: var(--color-bg-canvas, #ffffff);
  box-shadow: none;
}

.store-header--menu-open {
  --header-surface: var(--color-bg-canvas, #ffffff);
  background: var(--header-surface) !important;
  box-shadow: none;
}

/* ── Top utility promo bar ── */
.store-promo {
  position: relative;
  z-index: 5;
  align-self: center;
  overflow: hidden;
  width: min(100%, 640px);
  max-width: 640px;
  min-width: 0;
  min-height: 32px;
  border-radius: 0;
  background: transparent;
  color: var(--ink);
  border-bottom: 0;
  justify-self: start;
}

.store-promo__inner {
  width: 100%;
  max-width: none;
  height: 32px;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  box-sizing: border-box;
}

.store-promo__viewport {
  overflow: hidden;
  width: 100%;
  min-width: 0;
  flex: 1 1 auto;
}

.store-promo__track {
  display: flex;
  width: max-content;
  animation: store-promo-marquee 30s linear infinite;
  will-change: transform;
}

.store-promo__group {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
}

.store-promo__item,
.store-promo__separator {
  min-height: 32px;
}

.store-promo__item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 clamp(5px, 0.55vw, 9px);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
  color: rgba(17, 17, 17, 0.82);
}

.store-promo__item svg {
  width: 14px; height: 14px;
  flex: 0 0 auto;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8;
}

.store-promo__copy {
  white-space: nowrap;
}

.store-promo__copy strong {
  color: #111111;
  font-weight: 800;
}

.store-promo__separator {
  display: inline-flex;
  align-items: center;
  color: rgba(17, 17, 17, 0.32);
  font-size: 11px;
  padding: 0 2px;
}

.store-promo__utility {
  position: relative;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex: 0 0 auto;
  height: 38px;
  padding-left: 6px;
  background: transparent;
  color: var(--ink);
}

.store-promo__utility-separator {
  color: rgba(17, 17, 17, 0.42);
  font-size: 16px;
  line-height: 1;
}

.order-lookup-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 30px;
  color: currentColor;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0;
  text-decoration: none;
  white-space: nowrap;
}

.order-lookup-link:hover {
  color: rgba(255, 255, 255, 0.72);
}

.order-lookup-link svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@keyframes store-promo-marquee {
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(-16.6667%, 0, 0); }
}

/* ── Inner layout ── */
.store-header__inner {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0 clamp(18px, 2.4vw, 42px);
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns:
    minmax(108px, auto)
    minmax(220px, 640px)
    minmax(220px, 360px)
    minmax(260px, auto);
  justify-content: space-between;
  align-items: center;
  gap: clamp(12px, 1.7vw, 28px);
  height: 62px;
  background: var(--header-surface);
  box-sizing: border-box;
}

.store-header__left,
.store-header__right,
.store-actions {
  display: flex;
  align-items: center;
}

.store-header__left {
  justify-self: start;
  gap: 0;
  min-width: 0;
}

.store-header__right {
  justify-self: end;
  justify-content: flex-end;
  min-width: 0;
}

/* ── Logo ── */
.brand-lockup {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  flex-shrink: 0;
}

.brand-lockup__logo {
  display: block;
  width: auto;
  height: 38px;
  object-fit: contain;
  background: transparent;
}

.store-locale,
.store-location {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-weight: 650;
  white-space: nowrap;
}

.store-locale {
  min-height: 36px;
  padding: 0;
  cursor: pointer;
  font-size: 16px;
}

.store-locale svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.store-location {
  max-width: 148px;
  min-width: 0;
  font-size: 11px;
  line-height: 1.05;
  text-transform: uppercase;
}

.store-location span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.store-location svg {
  width: 21px;
  height: 21px;
  flex: 0 0 auto;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.store-header__nav-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(18px, 3vw, 56px);
  height: 46px;
  padding: 0 clamp(18px, 2.4vw, 42px);
  background: var(--header-surface);
  border-top: 0;
  border-bottom: 0;
  box-sizing: border-box;
}

/* ── Main nav — Nike style ── */
.store-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(18px, 2.7vw, 44px);
  white-space: nowrap;
}

.store-nav__item { position: relative; }

.store-nav__link {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 46px;
  padding: 0;
  text-decoration: none;
  font-size: 15px;
  font-weight: 450;
  letter-spacing: 0;
  color: var(--ink);
  background: transparent;
  transition: color 150ms ease;
}

.store-nav__link--button {
  appearance: none;
  border: 0;
  cursor: default;
  font-family: inherit;
  font-size: 15px;
  font-weight: 450;
  line-height: normal;
}

/* Nike underline on hover/active */
.store-nav__link::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 6px;
  height: 1.5px;
  background: var(--ink);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 200ms ease;
}

.store-nav__link:hover { color: var(--ink); }

.store-nav__link:hover::after,
.store-nav__link--active::after { transform: scaleX(1); }

.store-nav__link--active {
  color: var(--ink);
  font-weight: 700;
}

.store-nav-promos {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: clamp(18px, 3vw, 42px);
  min-width: 0;
  white-space: nowrap;
}

.store-nav-promos a {
  color: #f02b1f;
  text-decoration: none;
  font-size: 15px;
  font-weight: 750;
}

.store-nav-promos a:hover {
  color: #c61f16;
}

/* ── Right-side actions ── */
.store-actions { gap: 12px; }

/* Search bar — Nike pill style */
.store-action--search-pill {
  display: inline-flex;
  align-items: center;
  justify-self: center;
  gap: 9px;
  width: min(100%, 360px);
  height: 38px;
  padding: 0 16px;
  border: 1px solid rgba(17, 17, 17, 0.1);
  border-radius: 999px !important;
  background: #f4f4f4;
  color: rgba(17,17,17,0.58);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0;
  cursor: pointer;
  font-family: inherit;
  transition: background 150ms ease, color 150ms ease;
  white-space: nowrap;
  min-width: 0;
}

.store-action--search-pill span {
  flex: 1 1 auto;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
}

.store-action--search-pill__text--active {
  color: #111111;
  font-weight: 650;
}

:global(html body.hem-shop-shell #app .store-action--search-pill),
:global(html body.hem-shop-shell #app .store-action--search-pill:hover) {
  border-radius: 999px !important;
}

.store-action--search-pill:hover {
  background: #eeeeee;
  border-color: rgba(17, 17, 17, 0.2);
  color: var(--ink);
}

.store-action--search-pill svg {
  width: 18px; height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round; stroke-linejoin: round;
  flex-shrink: 0;
  opacity: 0.55;
}

.store-action-labeled {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 54px;
  min-height: 48px;
  border: none;
  border-radius: 8px !important;
  background: transparent;
  color: var(--ink);
  text-decoration: none;
  cursor: pointer;
  transition: background 150ms ease;
  font: inherit;
  font-size: 11px;
  font-weight: 650;
  line-height: 1;
  white-space: nowrap;
  flex: 0 0 auto;
}

.store-action-labeled > span {
  display: block;
  white-space: nowrap;
}

.account-menu__trigger > span {
  display: block;
  max-width: 78px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.store-action-labeled--orders {
  min-width: 88px;
  padding-inline: 4px;
}

:global(html body.hem-shop-shell #app .store-action-labeled),
:global(html body.hem-shop-shell #app .store-action-labeled:hover) {
  border-radius: 8px !important;
}

.store-action-labeled:hover { background: rgba(17,17,17,0.06); }

.store-action-labeled svg {
  width: 24px; height: 24px;
  stroke: currentColor;
  stroke-width: 1.8;
  fill: none;
  stroke-linecap: round; stroke-linejoin: round;
}

/* Studio action */
.store-action-labeled--studio { color: var(--ink-muted); }
.store-action-labeled--studio:hover { color: var(--ink); }

/* Cart badge */
.store-action__badge {
  position: absolute;
  top: 1px; right: 4px;
  min-width: 17px; height: 17px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--ink);
  color: #ffffff;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.01em;
}

:global(html body.hem-shop-shell #app .store-action__badge--cart) {
  border-radius: 999px !important;
}

/* ── Account — Nike "Hi, ben" style ── */
.account-login,
.account-menu__trigger {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 54px;
  min-height: 48px;
  padding: 0 4px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--ink);
  text-decoration: none;
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  font-weight: 650;
  line-height: 1;
  white-space: nowrap;
  transition: background 150ms ease;
  max-width: 86px;
}

:global(html body.hem-shop-shell #app .account-login),
:global(html body.hem-shop-shell #app .account-menu__trigger) {
  border-radius: 8px !important;
}

.account-login:hover,
.account-menu:hover .account-menu__trigger,
.account-menu:focus-within .account-menu__trigger {
  background: rgba(17,17,17,0.06);
  color: var(--ink);
}

.account-login svg,
.account-menu__trigger svg {
  width: 24px; height: 24px;
  stroke: currentColor;
  stroke-width: 2;
  fill: none;
  stroke-linecap: round; stroke-linejoin: round;
}

/* Account dropdown — matches Nike / image 3 */
.account-menu {
  position: relative;
  display: inline-flex;
  padding: 0;
  margin: 0;
  z-index: 400;
}

.account-menu::after {
  content: '';
  position: absolute;
  top: 100%; right: 0;
  width: 120%; height: 16px;
}

.account-menu__dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 400;
  width: min(260px, calc(100vw - 28px));
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 28px 32px 28px;
  border: none;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12), 0 12px 40px rgba(0,0,0,0.10);
  opacity: 0;
  visibility: hidden;
  transform: translateY(4px);
  pointer-events: none;
  transition: opacity 160ms ease, transform 160ms ease, visibility 0s linear 160ms;
}

.account-menu:hover .account-menu__dropdown,
.account-menu:focus-within .account-menu__dropdown {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  pointer-events: auto;
  transition: opacity 160ms ease, transform 160ms ease, visibility 0s linear 0s;
}

.account-menu--closing .account-menu__dropdown,
.account-menu--closing:hover .account-menu__dropdown,
.account-menu--closing:focus-within .account-menu__dropdown {
  opacity: 0;
  visibility: hidden;
  transform: translateY(4px);
  pointer-events: none;
  transition: opacity 120ms ease, transform 120ms ease, visibility 0s linear 120ms;
}

/* "Account" heading — modern style */
.account-menu__title {
  display: block;
  margin: 0 0 14px;
  font-size: 18px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.04em;
  color: #111111;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(17,17,17,0.08);
}

.account-menu__link {
  display: flex;
  align-items: center;
  min-height: 34px;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: var(--ink-muted);
  text-align: left;
  text-decoration: none;
  font: inherit;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition: color 130ms ease;
  width: 100%;
}

.account-menu__link:hover,
.account-menu__link:focus-visible {
  color: var(--ink);
  outline: none;
}

.account-menu__logout { color: var(--ink-muted); }

/* ── Mobile menu toggle ── */
.store-action--menu { display: none; }

/* ── Responsive ── */
@media (min-width: 961px) and (max-width: 1280px) {
  .store-promo {
    display: none;
  }

  .store-header__inner {
    grid-template-columns: minmax(96px, auto) minmax(220px, 1fr) auto;
    gap: 12px;
  }

  .store-actions {
    gap: 7px;
  }

  .account-login,
  .account-menu__trigger {
    max-width: 72px;
  }

  .account-menu__trigger > span {
    max-width: 64px;
  }
}

@media (max-width: 960px) {
  .store-promo {
    display: none;
  }

  .store-header__inner {
    width: 100%;
    height: 70px;
    padding: 0 14px;
    grid-template-columns: auto 1fr auto;
    gap: 12px;
  }

  .store-header__left {
    gap: 12px;
  }

  .store-header__nav-row {
    display: none;
  }

  .store-location {
    display: none;
  }

  .store-action--menu { display: inline-flex; }

  .store-action--search-pill {
    height: 42px;
    min-width: 0;
    padding: 0 14px;
    font-size: 13px;
  }

  .store-actions {
    gap: 6px;
  }

  .account-login,
  .account-menu__trigger,
  .store-action-labeled {
    min-width: 44px;
    min-height: 44px;
    font-size: 10px;
  }

  .store-action-labeled > span,
  .account-login > span,
  .account-menu__trigger > span {
    display: none;
  }

}

@media (max-width: 560px) {
  .store-header__inner {
    height: 64px;
    gap: 8px;
    padding: 0 10px;
  }

  .account-login,
  .account-menu__trigger {
    font-size: 10px;
  }

  .account-login svg,
  .account-menu__trigger svg,
  .store-action-labeled svg {
    width: 22px;
    height: 22px;
  }

  .brand-lockup__logo { height: 34px; }
  .store-actions { gap: 0; }
  .account-menu__dropdown { right: -52px; }

  .store-action--search-pill {
    min-width: unset;
    padding: 0;
    width: 40px;
    justify-content: center;
  }

  .store-action--search-pill span { display: none; }

}

@media (prefers-reduced-motion: reduce) {
  .store-promo__track { animation: none; }
}

</style>
