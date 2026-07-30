<template>
  <transition name="mega-backdrop">
    <div v-if="showMegaMenuBackdrop" class="store-nav-backdrop" @mouseenter="$emit('schedule-close')" @click="$emit('close')"></div>
  </transition>

  <transition name="mega-menu">
    <aside
      v-if="showMegaMenuBackdrop"
      class="mega-menu"
      @mouseenter="$emit('open-department-menu', hoveredDepartment)"
      @mouseleave="$emit('schedule-close')"
    >
      <div
        class="mega-menu__inner"
        :class="[
          `mega-menu__inner--${hoveredDepartment}`,
          {
            'mega-menu__inner--with-products': hasProductShelfContent,
            'mega-menu__inner--with-secondary': activePrimaryChildren.length
          }
        ]"
      >
        <button type="button" class="mega-menu__close" aria-label="Close menu" @click="$emit('close')">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15"/>
          </svg>
        </button>

        <section class="mega-menu__panel mega-menu__panel--primary">
          <div class="mega-menu__panel-head">
            <p class="mega-menu__panel-title">{{ primaryMenuTitle }}</p>
          </div>

          <div v-if="primaryMenuItems.length" class="mega-menu__drill-list">
            <component
              :is="item.children.length ? 'button' : 'router-link'"
              v-for="item in primaryMenuItems"
              :key="item.key"
              :to="item.children.length ? undefined : item.route"
              type="button"
              class="mega-menu__drill-item"
              :class="{ 'mega-menu__drill-item--active': activePrimaryItem && activePrimaryItem.key === item.key }"
              @mouseenter="setActivePrimary(item)"
              @focus="setActivePrimary(item)"
              @click="handlePrimaryClick(item)"
            >
              <span>
                {{ item.label }}
                <small v-if="item.caption">{{ item.caption }}</small>
              </span>
              <svg v-if="item.children.length" viewBox="0 0 16 16" aria-hidden="true">
                <path d="m6 3 5 5-5 5" />
              </svg>
            </component>
          </div>

          <p v-else class="mega-menu__empty">No items available yet.</p>
        </section>

        <section v-if="activePrimaryChildren.length" class="mega-menu__panel mega-menu__panel--secondary">
          <div class="mega-menu__panel-head">
            <p class="mega-menu__panel-title">{{ activePrimaryItem.label }}</p>
          </div>

          <div class="mega-menu__drill-list">
            <router-link
              v-for="link in activePrimaryChildren"
              :key="link.key || link.label"
              :to="link.route"
              class="mega-menu__drill-item mega-menu__drill-item--child"
              @click="$emit('close')"
            >
              <span>
                {{ link.label }}
                <small v-if="link.caption">{{ link.caption }}</small>
              </span>
            </router-link>
          </div>
        </section>

        <section v-if="hasProductShelfContent" class="mega-menu__products" aria-label="Popular products">
          <div v-if="visibleProductShelfGroups.length" class="mega-menu__collection-shelf">
            <h2 class="mega-menu__products-title">{{ productShelf.title }}</h2>

            <div class="mega-menu__collection-rows">
              <section
                v-for="group in visibleProductShelfGroups"
                :key="group.key"
                class="mega-menu__collection-row"
              >
                <ShopProductPreviewGrid
                  :section-id="`mega-menu-collection-${group.key}`"
                  :label="group.title"
                  :products="group.products"
                  compact
                  class="mega-menu__product-grid mega-menu__product-grid--collection-row"
                />
              </section>
            </div>
          </div>

          <template v-else>
            <ShopProductPreviewGrid
              section-id="mega-menu-products"
              :label="productShelf.title"
              :products="visibleProductShelfProducts"
              compact
              class="mega-menu__product-grid mega-menu__product-grid--popular"
            />
          </template>
        </section>
      </div>
    </aside>
  </transition>
</template>

<script>
import ShopProductPreviewGrid from '../shop/ShopProductPreviewGrid.vue';

export default {
  name: 'MegaMenu',
  components: {
    ShopProductPreviewGrid
  },
  data() {
    return {
      activePrimaryKey: ''
    };
  },
  props: {
    showMegaMenuBackdrop: { type: Boolean, default: false },
    hoveredDepartment:    { type: String,  default: '' },
    navCollections:       { type: Array,   default: () => [] },
    departmentCategories:       { type: Function, required: true },
    departmentCategoryRoute:    { type: Function, required: true },
    formatCategoryLabel:        { type: Function, required: true },
    departmentShortcutLinks:    { type: Function, required: true },
    departmentCollectionRoute:  { type: Function, required: true },
    megaMenuSections:           { type: Function, required: true },
    megaMenuProductShelf:       { type: Function, required: true }
  },
  emits: ['open-department-menu', 'schedule-close', 'close'],
  watch: {
    hoveredDepartment() {
      this.resetActivePrimary();
    },
    showMegaMenuBackdrop(value) {
      if (value) {
        this.resetActivePrimary();
      }
    },
    menuSections() {
      this.resetActivePrimary();
    }
  },
  computed: {
    menuSections() {
      const sections = this.megaMenuSections(this.hoveredDepartment);
      return Array.isArray(sections) ? sections.filter(Boolean) : [];
    },
    primaryMenuTitle() {
      const key = String(this.hoveredDepartment || '').toLowerCase();
      if (key === 'men') return 'Men';
      if (key === 'women') return 'Women';
      if (key === 'sale') return 'Sale';
      if (key === 'collections') return 'Collections';
      return 'Menu';
    },
    primaryMenuItems() {
      const normalizedMenu = String(this.hoveredDepartment || '').toLowerCase();

      if (normalizedMenu === 'collections') {
        return this.menuSections.flatMap(section =>
          (Array.isArray(section.links) ? section.links : []).map(link => ({
            key: link.key || link.label,
            label: link.label,
            caption: link.caption || '',
            route: link.route,
            shelfScope: link.shelfScope || null,
            children: []
          }))
        );
      }

      return this.menuSections.flatMap(section => {
        const links = Array.isArray(section.links) ? section.links : [];
        const sectionKey = String(section.key || section.title || '').toLowerCase();
        const isFeatured = sectionKey.includes('featured') || String(section.title || '').toLowerCase() === 'featured';

        if (isFeatured) {
          return links.map(link => ({
            key: link.key || link.label,
            label: link.label,
            caption: link.caption || '',
            route: link.route,
            children: []
          }));
        }

        return [{
          key: section.key || section.title,
          label: section.title,
          caption: '',
          route: section.route || (links[0] && links[0].route) || null,
          shelfScope: section.shelfScope || null,
          children: links
        }];
      }).filter(item => item && item.label);
    },
    activePrimaryItem() {
      if (!this.primaryMenuItems.length) return null;
      const activeItem = this.primaryMenuItems.find(item => item.key === this.activePrimaryKey);
      return activeItem || null;
    },
    activePrimaryChildren() {
      return this.activePrimaryItem && Array.isArray(this.activePrimaryItem.children)
        ? this.activePrimaryItem.children
        : [];
    },
    activeProductShelfScope() {
      if (!this.activePrimaryItem) return '';
      return this.activePrimaryItem.shelfScope || '';
    },
    productShelf() {
      const shelf = this.megaMenuProductShelf(this.hoveredDepartment, this.activeProductShelfScope);
      return {
        title: String(shelf && shelf.title || 'Popular Products'),
        products: Array.isArray(shelf && shelf.products) ? shelf.products : [],
        groups: Array.isArray(shelf && shelf.groups) ? shelf.groups : []
      };
    },
    hasProductShelfContent() {
      return Boolean(this.productShelf.products.length || this.visibleProductShelfGroups.length);
    },
    visibleProductShelfProducts() {
      const limit = this.activePrimaryChildren.length ? 4 : 5;
      return this.productShelf.products.slice(0, limit);
    },
    visibleProductShelfGroups() {
      const limit = this.activePrimaryChildren.length ? 4 : 5;

      return this.productShelf.groups
        .filter(group => group && Array.isArray(group.products) && group.products.length)
        .map(group => ({
          key: String(group.key || group.title || '').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase(),
          title: String(group.title || '').trim(),
          products: group.products.slice(0, limit)
        }))
        .filter(group => group.key && group.title && group.products.length)
        .slice(0, 2);
    }
  },
  methods: {
    resetActivePrimary() {
      this.$nextTick(() => {
        this.activePrimaryKey = '';
      });
    },
    setActivePrimary(item) {
      if (!item || !item.key) return;
      this.activePrimaryKey = item.key;
    },
    handlePrimaryClick(item) {
      if (!item) return;

      if (item.children.length) {
        this.setActivePrimary(item);
        return;
      }

      this.$emit('close');
    }
  }
};
</script>

<style scoped>
/* ── Backdrop ── */
.store-nav-backdrop {
  position: fixed;
  top: var(--store-header-height);
  right: 0; bottom: 0; left: 0;
  z-index: 35;
  background: rgba(17,17,17,0.3);
  pointer-events: auto;
}

/* ── Mega menu panel ── */
.mega-menu {
  position: fixed;
  top: var(--store-header-height);
  left: 0; right: 0;
  z-index: 60;
}

.mega-menu__inner {
  --mega-panel-bg: #f4f2ee;
  --mega-panel-border: rgba(17, 17, 17, 0.12);
  position: relative;
  left: 50%;
  width: 100vw;
  margin-left: -50vw;
  display: grid;
  grid-template-columns: minmax(260px, 340px);
  justify-content: stretch;
  align-items: start;
  gap: clamp(28px, 2.4vw, 44px);
  padding: 24px max(var(--layout-gutter), 48px) 32px;
  background: #ffffff;
  box-shadow: 0 18px 50px rgba(17, 17, 17, 0.14);
  max-height: calc(100vh - var(--store-header-height) - 12px);
  overflow-y: auto;
}

.mega-menu__inner--new-featured {
  justify-content: flex-start;
  padding-left: clamp(48px, 8vw, 140px);
}

.mega-menu__inner--sale {
  justify-content: stretch;
}

.mega-menu__inner--with-products {
  grid-template-columns: minmax(300px, 320px) minmax(0, 1fr);
}

.mega-menu__inner--with-products:not(.mega-menu__inner--with-secondary) {
  grid-template-columns: minmax(300px, 320px) minmax(0, 1fr);
  justify-content: stretch;
}

.mega-menu__inner--with-secondary {
  grid-template-columns: minmax(300px, 320px) minmax(320px, 360px);
}

.mega-menu__inner--with-products.mega-menu__inner--with-secondary {
  grid-template-columns:
    minmax(300px, 320px)
    minmax(320px, 360px)
    minmax(0, 1fr);
  gap: clamp(24px, 2vw, 36px);
}

/* ── Close button ── */
.mega-menu__close {
  position: absolute;
  top: 14px;
  right: max(var(--layout-gutter), 48px);
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px; height: 36px;
  border: none;
  border-radius: 999px;
  background: #111111;
  color: #ffffff;
  box-shadow: 0 8px 22px rgba(17, 17, 17, 0.2);
  cursor: pointer;
  transition: background 140ms ease, transform 140ms ease;
}

.mega-menu__close:hover {
  background: #333333;
  transform: scale(1.04);
}

.mega-menu__close svg {
  width: 16px; height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

/* ── Drilldown panels ── */
.mega-menu__panel {
  min-width: 0;
  padding: 14px 16px 16px;
  border: 1px solid var(--mega-panel-border);
  border-radius: 12px;
  background: var(--mega-panel-bg);
  box-shadow: 0 10px 28px rgba(17, 17, 17, 0.06);
}

.mega-menu__panel--primary {
  grid-column: 1;
}

.mega-menu__panel--secondary {
  grid-column: 2;
  background: #ffffff;
  border-color: rgba(17, 17, 17, 0.16);
}

.mega-menu__panel-head {
  display: flex;
  align-items: center;
  min-height: 46px;
  padding: 0 10px;
  border-bottom: 1px solid rgba(17, 17, 17, 0.22);
}

.mega-menu__panel-title {
  margin: 0;
  color: #111111;
  font-size: clamp(20px, 1.45vw, 23px);
  font-weight: 750;
  line-height: 1;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.mega-menu__drill-list {
  display: grid;
  gap: 0;
}

.mega-menu__drill-item {
  width: 100%;
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0 16px;
  border: 0;
  border-bottom: 1px solid rgba(17, 17, 17, 0.10);
  background: transparent;
  color: #111111;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  font-family: inherit;
  font-size: clamp(17px, 1.25vw, 20px);
  font-weight: 420;
  line-height: 1.25;
  transition: background 140ms ease, color 140ms ease;
}

.mega-menu__drill-item span {
  min-width: 0;
}

.mega-menu__drill-item small {
  display: block;
  margin-top: 4px;
  color: rgba(17, 17, 17, 0.48);
  font-size: clamp(13px, 0.92vw, 15px);
  font-weight: 450;
}

.mega-menu__drill-item svg {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.mega-menu__drill-item:hover,
.mega-menu__drill-item:focus-visible {
  background: #e9e5de;
  color: #111111;
  outline: none;
}

.mega-menu__drill-item--active,
.mega-menu__drill-item--active:hover,
.mega-menu__drill-item--active:focus-visible {
  margin: 4px 0;
  min-height: 46px;
  border-bottom-color: transparent;
  border-radius: 8px;
  background: #111111;
  color: #ffffff;
  font-weight: 700;
}

.mega-menu__drill-item--active small {
  color: rgba(255, 255, 255, 0.68);
}

.mega-menu__drill-item--child {
  justify-content: flex-start;
  min-height: 56px;
  padding-inline: 16px;
  font-weight: 420;
}

.mega-menu__products {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  justify-self: stretch;
  display: grid;
  align-content: start;
  gap: 18px;
  padding-left: 0;
  border-left: 0;
  overflow: hidden;
}

.mega-menu__inner--with-products:not(.mega-menu__inner--with-secondary) .mega-menu__products {
  max-width: none;
}

.mega-menu__inner--with-secondary .mega-menu__products {
  grid-column: 3;
  width: 100%;
  max-width: none;
  padding-left: 0;
}

.mega-menu__product-grid {
  min-width: 0;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}

.mega-menu__product-grid :deep(.product-preview-grid__items) {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  justify-content: stretch;
  gap: 2px;
}

.mega-menu__product-grid--popular :deep(.product-preview-grid__items) {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.mega-menu__inner--with-secondary .mega-menu__product-grid--popular :deep(.product-preview-grid__items) {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.mega-menu__inner--with-secondary .mega-menu__product-grid--collection-row :deep(.product-preview-grid__items) {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.mega-menu__product-grid :deep(.product-card__title) {
  min-height: 2.9em;
}

.mega-menu__product-grid :deep(.product-card__rating) {
  display: none;
}

.mega-menu__collection-shelf,
.mega-menu__collection-rows,
.mega-menu__collection-row {
  display: grid;
  min-width: 0;
}

.mega-menu__collection-shelf {
  gap: 22px;
}

.mega-menu__products-title {
  margin: 0;
  color: #111111;
  font-size: clamp(20px, 1.45vw, 23px);
  font-weight: 750;
  line-height: 1;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.mega-menu__products-kicker {
  margin: 0;
  color: rgba(17, 17, 17, 0.62);
  font-size: clamp(15px, 0.9vw, 17px);
  font-weight: 750;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.mega-menu__collection-rows {
  gap: clamp(28px, 3vw, 42px);
}

.mega-menu__collection-row {
  gap: 12px;
  padding-top: 2px;
}

.mega-menu__collection-title {
  margin: 0;
  color: rgba(17, 17, 17, 0.56);
  font-size: clamp(15px, 1vw, 17px);
  font-weight: 650;
  line-height: 1.1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.mega-menu__product-grid--collection-row :deep(.product-preview-grid) {
  --preview-grid-columns: 3;
  gap: 0;
}

.mega-menu__product-grid--collection-row :deep(.product-preview-grid h2) {
  display: none;
}

.mega-menu__product-grid :deep(.product-preview-grid) {
  width: 100%;
}

/* ── Link list ── */
.mega-menu__link-list {
  display: grid;
  gap: 0;
}

/* ── Individual link — clean Nike style ── */
.mega-menu__link {
  display: grid;
  gap: 2px;
  align-content: center;
  min-height: 30px;
  padding: 2px 0;
  color: rgba(17,17,17,0.58);
  text-decoration: none;
  transition: color 130ms ease;
  border: none;
}

.mega-menu__link span {
  font-size: 13.5px;
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1.3;
}

.mega-menu__link small {
  font-size: 11px;
  font-weight: 400;
  color: rgba(17,17,17,0.36);
}

.mega-menu__link:hover,
.mega-menu__link:focus-visible {
  color: #111111;
  outline: none;
}

/* ── Empty state ── */
.mega-menu__empty {
  margin: 0;
  color: rgba(17,17,17,0.36);
  font-size: 13px;
  font-weight: 400;
}

/* ── Transitions ── */
.mega-backdrop-enter-active,
.mega-backdrop-leave-active {
  transition: opacity 200ms ease;
}
.mega-backdrop-enter-from,
.mega-backdrop-leave-to {
  opacity: 0;
}

.mega-menu-enter-active,
.mega-menu-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}
.mega-menu-enter-from,
.mega-menu-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ── Responsive ── */
@media (max-width: 1600px) {
  .mega-menu__product-grid :deep(.product-preview-grid__items),
  .mega-menu__product-grid--popular :deep(.product-preview-grid__items) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .mega-menu__product-grid :deep(.product-preview-grid__item:nth-child(n + 5)) {
    display: none;
  }

  .mega-menu__inner--with-secondary .mega-menu__product-grid--popular :deep(.product-preview-grid__items) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 1360px) {
  .mega-menu__product-grid :deep(.product-preview-grid__items),
  .mega-menu__product-grid--popular :deep(.product-preview-grid__items) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .mega-menu__product-grid :deep(.product-preview-grid__item:nth-child(n + 5)) {
    display: none;
  }

  .mega-menu__inner--with-secondary .mega-menu__product-grid--popular :deep(.product-preview-grid__items) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .mega-menu__inner--with-secondary .mega-menu__product-grid--popular :deep(.product-preview-grid__item:nth-child(n + 4)) {
    display: none;
  }
}

@media (max-width: 1240px) {
  .mega-menu__inner {
    gap: 22px;
    padding-right: 32px;
    padding-left: 32px;
    justify-content: flex-start;
  }

  .mega-menu__inner--with-products {
    grid-template-columns: minmax(260px, 280px) minmax(0, 1fr);
  }

  .mega-menu__inner--with-products.mega-menu__inner--with-secondary {
    grid-template-columns:
      minmax(260px, 280px)
      minmax(280px, 310px)
      minmax(0, 1fr);
  }
}

@media (max-width: 1100px) {
  .mega-menu__inner--with-products.mega-menu__inner--with-secondary {
    grid-template-columns: minmax(250px, 300px) minmax(280px, 340px);
  }

  .mega-menu__inner--with-products.mega-menu__inner--with-secondary .mega-menu__products {
    display: none;
  }
}

@media (max-width: 960px) {
  .store-nav-backdrop,
  .mega-menu {
    display: none;
  }
}
</style>
