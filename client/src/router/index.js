import { createRouter, createWebHistory } from 'vue-router';
import { authStore } from '../stores/authStore';
import { legacyAdminRedirect, legacyStorefrontRedirect } from './legacyRedirects';
import { DEFAULT_TITLE, resolveRouteTitle } from './routeTitles';
import { adminRoutes } from './routes/adminRoutes';
import { storefrontRoutes } from './routes/storefrontRoutes';

let titleRequestId = 0;
const INFORMATION_PAGE_ANCHOR_OFFSET = 168;
const SAVED_SCROLL_RESTORE_TIMEOUT_MS = 2000;
const HISTORY_SCROLL_RESET_ROUTES = new Set([
  'checkout',
  'checkout-payment',
  'reset-password',
  'verify-email',
  'new-product',
  'edit-product',
  'studio-category-new',
  'studio-category-edit',
  'studio-collection-new',
  'studio-collection-edit',
  'studio-voucher-new',
  'studio-voucher-edit'
]);

if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

const restoreSavedScrollPosition = savedPosition => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return savedPosition;
  }

  const position = {
    left: Math.max(0, Number(savedPosition.left) || 0),
    top: Math.max(0, Number(savedPosition.top) || 0),
    behavior: 'auto'
  };

  if (!position.top) return position;

  return new Promise(resolve => {
    const startedAt = Date.now();

    const waitForPageHeight = () => {
      const pageHeight = Math.max(
        document.documentElement ? document.documentElement.scrollHeight : 0,
        document.body ? document.body.scrollHeight : 0
      );
      const availableScroll = Math.max(0, pageHeight - window.innerHeight);

      if (
        availableScroll >= position.top ||
        Date.now() - startedAt >= SAVED_SCROLL_RESTORE_TIMEOUT_MS
      ) {
        resolve(position);
        return;
      }

      window.requestAnimationFrame(waitForPageHeight);
    };

    window.requestAnimationFrame(waitForPageHeight);
  });
};

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  linkActiveClass: 'is-active',
  linkExactActiveClass: 'is-active',
  routes: [...storefrontRoutes, ...adminRoutes],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      if (HISTORY_SCROLL_RESET_ROUTES.has(String(to.name || ''))) {
        return { left: 0, top: 0, behavior: 'auto' };
      }

      return restoreSavedScrollPosition(savedPosition);
    }

    if (to.hash) {
      return {
        el: to.hash,
        top: to.meta && to.meta.informationPage ? INFORMATION_PAGE_ANCHOR_OFFSET : 0,
        behavior: 'auto'
      };
    }

    if (
      to.path === from.path &&
      to.meta &&
      to.meta.preserveScrollOnQuery
    ) {
      return false;
    }

    if (
      to.meta &&
      to.meta.adminSection &&
      String(to.query && to.query.focus || '').trim()
    ) {
      return false;
    }

    return {
      left: 0,
      top: 0,
      behavior: 'auto'
    };
  }
});

const currentStorePath = route =>
  String(route.query && route.query.department ? route.query.department : '').toLowerCase() === 'men' ||
  route.path.startsWith('/men')
    ? '/men'
    : '/women';

// Keep admin sessions inside Studio before normalizing any storefront URL.
router.beforeEach(route => {
  const isStorefrontRoute = route.matched.some(record => record.meta.storefront);

  if (isStorefrontRoute && authStore.isAdmin()) return '/studio';

  const storefrontRedirect = legacyStorefrontRedirect(route);
  if (storefrontRedirect) return storefrontRedirect;

  const adminRedirect = legacyAdminRedirect(route);
  if (adminRedirect) return adminRedirect;

  if (route.matched.some(record => record.meta.requiresUser) && !authStore.isAuthenticated()) {
    return {
      path: currentStorePath(route),
      query: {
        auth: 'email',
        redirect: route.fullPath
      }
    };
  }

  if (route.matched.some(record => record.meta.requiresAdmin)) {
    if (!authStore.isAuthenticated()) {
      return {
        path: currentStorePath(route),
        query: {
          auth: 'email',
          redirect: route.fullPath
        }
      };
    }

    if (!authStore.isAdmin()) return currentStorePath(route);
  }

  if (
    (route.path === '/women' || route.path === '/men') &&
    route.query &&
    ['email', 'login', 'register', 'forgot', 'verify'].includes(String(route.query.auth || '')) &&
    authStore.isAdmin()
  ) {
    return '/studio';
  }
});

router.afterEach(async route => {
  const requestId = ++titleRequestId;

  try {
    const title = await resolveRouteTitle(route);
    if (requestId === titleRequestId) document.title = title || DEFAULT_TITLE;
  } catch {
    if (requestId === titleRequestId) document.title = DEFAULT_TITLE;
  }
});

export default router;
