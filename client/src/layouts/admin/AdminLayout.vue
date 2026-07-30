<template>
  <div class="admin-route-layout">
    <FlashMessages class="my-flash" />
    <router-view v-slot="{ Component, route }">
      <transition name="admin-page" mode="out-in">
        <keep-alive include="AdminDashboardView">
          <component :is="Component" :key="adminRouteViewKey(route)" />
        </keep-alive>
      </transition>
    </router-view>

    <transition name="admin-confirm">
      <div v-if="isLogoutConfirmOpen" class="admin-confirm-backdrop" @click.self="closeLogoutConfirm">
        <section class="admin-confirm-dialog admin-confirm-dialog--action" role="dialog" aria-modal="true" aria-labelledby="admin-logout-title">
              <p class="admin-confirm-dialog__eyebrow">HEM Studio</p>
              <h2 id="admin-logout-title">Sign out of Studio?</h2>
              <p>You will leave the admin dashboard and return to the HEM storefront.</p>

          <div class="admin-confirm-dialog__actions">
            <button type="button" class="admin-confirm-dialog__ghost" @click="closeLogoutConfirm">Stay Here</button>
            <button type="button" class="admin-confirm-dialog__danger" @click="confirmLogout">Sign Out</button>
          </div>
        </section>
      </div>
    </transition>

    <transition name="back-to-top">
      <button
        v-if="showBackToTop"
        type="button"
        class="admin-back-to-top"
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
  </div>
</template>

<script>
import FlashMessages from '../../components/common/FlashMessages.vue';
import { authStore } from '../../stores/authStore';
import { flash } from '../../helpers/flash';

export default {
  name: 'AdminLayout',
  components: {
    FlashMessages
  },
  data() {
    return {
      isLogoutConfirmOpen: false,
      showBackToTop: false
    };
  },
  created() {
    this.handleLogoutConfirmRequest = () => {
      this.isLogoutConfirmOpen = true;
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('request-logout-confirm', this.handleLogoutConfirmRequest);
    }
  },
  mounted() {
    this.handleWindowScroll();
    window.addEventListener('scroll', this.handleWindowScroll, { passive: true });
  },
  beforeUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('request-logout-confirm', this.handleLogoutConfirmRequest);
      window.removeEventListener('scroll', this.handleWindowScroll);
    }
  },
  methods: {
    handleWindowScroll() {
      this.showBackToTop = window.scrollY > 120;
    },
    scrollToTop() {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    },
    adminRouteViewKey(route) {
      const routeName = String(route && route.name || '');
      const editorType = String(route && route.meta && route.meta.adminEditor || '');

      if (editorType) {
        const editorId = String(route.params && route.params.id || 'new');
        return `admin-${editorType}-editor-${editorId}`;
      }

      if (routeName === 'new-product') {
        return 'admin-product-new';
      }

      if (routeName === 'edit-product') {
        return `admin-product-edit-${String(route.params && route.params.id || '')}`;
      }

      if (routeName === 'studio-customer-detail') {
        return `admin-customer-detail-${String(route.params && route.params.customerId || '')}`;
      }

      if (route && route.meta && route.meta.adminSection) {
        return 'admin-dashboard';
      }

      return route && route.fullPath ? route.fullPath : 'admin-route';
    },
    closeLogoutConfirm() {
      this.isLogoutConfirmOpen = false;
    },
    confirmLogout() {
      this.isLogoutConfirmOpen = false;
      authStore.clear();
      flash('You have been logged out.', 'success');
      this.$router.push({ path: '/women', query: { auth: 'email', redirect: '/studio' } });
    }
  }
};
</script>

<style scoped>
.admin-route-layout {
  --font-family-primary: 'Helvetica Neue', Helvetica, Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-weight-strong: 600;
  --nav-width: 240px;
  --page-bg: #ffffff;
  --space-1: 8px;
  --space-2: 12px;
  --space-3: 16px;
  --radius-md: 16px;
  --color-text-primary: #141414;
  --color-text-secondary: rgba(20, 20, 20, 0.62);
  --color-bg-surface-alt: rgba(255, 255, 255, 0.74);
  --color-border-default: rgba(21, 21, 21, 0.14);
  --motion-fast: 120ms cubic-bezier(0.2, 0.8, 0.2, 1);
  min-height: 100vh;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  background: var(--page-bg);
  color: #0d1f1e;
  font-family: var(--font-family-primary);
}

:deep(.admin-dashboard) {
  width: 100%;
  min-height: 100vh;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  background: var(--page-bg);
}

:deep(.admin-layout) {
  display: block;
  min-height: 100vh;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  padding-left: var(--nav-width);
}

:deep(.admin-sidebar) {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--nav-width);
  height: 100vh;
  box-sizing: border-box;
}

:deep(.admin-content) {
  min-width: 0;
  width: 100%;
  max-width: 100%;
  margin-left: 0;
  box-sizing: border-box;
  overflow-x: hidden;
}

:deep(.admin-topbar) {
  box-sizing: border-box;
}

.my-flash {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 5100;
  width: min(360px, calc(100vw - 32px));
  font-family: var(--font-family-primary);
}

.admin-back-to-top {
  position: fixed;
  right: clamp(0.75rem, 1.4vw, 1.25rem);
  bottom: clamp(0.75rem, 1.4vw, 1.25rem);
  z-index: 90;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 42px;
  padding: 0 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #050505;
  color: #ffffff;
  box-shadow: 0 12px 32px rgba(17, 17, 17, 0.22);
  cursor: pointer;
  font-size: clamp(0.78rem, 0.72rem + 0.1vw, 0.9rem);
  font-weight: 850;
  line-height: 1;
  letter-spacing: 0;
}

.admin-back-to-top:hover {
  background: #1a1a1a;
  transform: translateY(-2px);
}

.admin-back-to-top:focus-visible {
  outline: 2px solid #111111;
  outline-offset: 3px;
}

.admin-back-to-top svg {
  width: 1.05rem;
  height: 1.05rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.back-to-top-enter-active,
.back-to-top-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.back-to-top-enter-from,
.back-to-top-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.admin-confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 5000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(17, 17, 17, 0.36);
  backdrop-filter: blur(8px);
}

.admin-confirm-dialog--action {
  width: min(100%, 400px);
  display: grid;
  gap: 12px;
  padding: 26px;
  border: 0.5px solid rgba(17, 17, 17, 0.14);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.98);
  color: var(--color-text-primary);
  box-shadow: 0 24px 70px rgba(17, 17, 17, 0.18);
  font-family: var(--font-family-primary);
}

.admin-confirm-dialog--action h2,
.admin-confirm-dialog--action p {
  margin: 0;
}

.admin-confirm-dialog__eyebrow {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-strong);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.admin-confirm-dialog--action h2 {
  font-size: 17px;
  font-weight: 600;
  line-height: 1.25;
}

.admin-confirm-dialog--action > p:not(.admin-confirm-dialog__eyebrow) {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.admin-confirm-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding-top: 4px;
  margin-top: 8px;
}

.admin-confirm-dialog__ghost,
.admin-confirm-dialog__danger {
  min-width: 140px;
  min-height: 44px;
  height: auto;
  padding: 0 18px;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  border: 1px solid rgba(17, 17, 17, 0.16);

  border-radius: 8px !important;
  overflow: hidden;

  background: transparent;
  color: var(--color-text-primary);

  font-family: inherit;
  font-size: 13px;
  font-weight: 700;

  cursor: pointer;
  transition:
    background 220ms ease,
    border-color 220ms ease,
    color 220ms ease,
    transform 220ms ease;
}

.admin-confirm-dialog__danger {
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

.admin-confirm-dialog__ghost:hover:not(:disabled) {
  border-color: rgba(17, 17, 17, 0.22);
  background: rgba(17, 17, 17, 0.06);
  color: #111111;
  transform: translateY(-1px);
}

.admin-confirm-dialog__danger:hover:not(:disabled) {
  border-color: #2f2f2f;
  background: #2f2f2f;
  color: #ffffff;
  transform: translateY(-1px);
}

@media (max-width: 560px) {
  .my-flash {
    top: 12px;
    right: 12px;
  }

  .admin-confirm-dialog__actions {
    flex-direction: column;
  }
}

@media (max-width: 900px) {
  :deep(.admin-layout) {
    padding-left: 0;
  }

  :deep(.admin-sidebar) {
    position: static;
    width: auto;
    height: auto;
  }

  .admin-back-to-top {
    min-height: 38px;
    padding: 0 0.7rem;
  }
}

@media (min-width: 1440px) {
  .admin-confirm-dialog--action {
    width: min(100%, 540px);
    gap: 16px;
    padding: 36px;
  }

  .admin-confirm-dialog__eyebrow {
    font-size: 13px;
  }

  .admin-confirm-dialog--action h2 {
    font-size: 24px;
  }

  .admin-confirm-dialog--action > p:not(.admin-confirm-dialog__eyebrow) {
    font-size: 16px;
  }

  .admin-confirm-dialog__ghost,
  .admin-confirm-dialog__danger {
    min-height: 48px;
    font-size: 15px;
  }
}

@media (min-width: 1920px) {
  .admin-confirm-dialog--action {
    width: min(100%, 620px);
    padding: 42px;
  }

  .admin-confirm-dialog--action h2 {
    font-size: 28px;
  }

  .admin-confirm-dialog--action > p:not(.admin-confirm-dialog__eyebrow) {
    font-size: 18px;
  }

  .admin-confirm-dialog__ghost,
  .admin-confirm-dialog__danger {
    min-height: 52px;
    font-size: 16px;
  }
}
</style>
