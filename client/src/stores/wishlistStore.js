import { wishlistApi } from '../services/wishlistApi';
import { authStore } from './authStore';
import {
  clearFavoriteNotice,
  showFavoriteNotice as showFavoriteNoticeDrawer
} from './favoriteNoticeStore';
import {
  listingFavoriteKey,
  listingFavoriteKeyForProduct,
  parseListingFavoriteKey
} from '../helpers/shop/listingColorCards';

let activeUserId = '';
let favoriteIdsState = [];
let isHydrated = false;
let syncPromise = null;
let userScopeVersion = 0;
let favoriteMutationQueue = Promise.resolve();
const pendingFavoriteStates = new Map();

const safeWindow = () => (typeof window !== 'undefined' ? window : null);

const normalizeFavoriteIds = value =>
  [...new Set((Array.isArray(value) ? value : []).map(item => String(item || '').trim()).filter(Boolean))];

const syncUserScope = () => {
  const user = authStore.getUser();
  const nextUserId = user ? String(user.id) : '';

  if (nextUserId !== activeUserId) {
    activeUserId = nextUserId;
    favoriteIdsState = [];
    isHydrated = false;
    syncPromise = null;
    userScopeVersion += 1;
    favoriteMutationQueue = Promise.resolve();
    pendingFavoriteStates.clear();
  }

  return nextUserId;
};

const dispatchFavoriteEvent = (ids, detail = {}) => {
  const browserWindow = safeWindow();

  if (!browserWindow) {
    return;
  }

  browserWindow.dispatchEvent(
    new CustomEvent('favorites-updated', {
      detail: {
        count: ids.length,
        ...detail
      }
    })
  );
};

const applyFavoriteIds = (ids, detail = {}) => {
  favoriteIdsState = normalizeFavoriteIds(ids);
  isHydrated = true;
  dispatchFavoriteEvent(favoriteIdsState, detail);
  return [...favoriteIdsState];
};

const applyPendingFavoriteStates = ids => {
  const nextIds = normalizeFavoriteIds(ids);

  pendingFavoriteStates.forEach((isFavorite, key) => {
    const existingIndex = nextIds.indexOf(key);

    if (isFavorite && existingIndex < 0) {
      nextIds.unshift(key);
    }

    if (!isFavorite && existingIndex >= 0) {
      nextIds.splice(existingIndex, 1);
    }
  });

  return nextIds;
};

const applyServerFavoriteIds = (ids, detail = {}) =>
  applyFavoriteIds(applyPendingFavoriteStates(ids), detail);

const enqueueFavoriteMutation = mutation => {
  const queuedMutation = favoriteMutationQueue.then(mutation, mutation);
  favoriteMutationQueue = queuedMutation.catch(() => null);
  return queuedMutation;
};

export const favoritesStore = {
  favoriteKey(productOrId, colorVariantId = '') {
    if (productOrId && typeof productOrId === 'object') {
      if (colorVariantId) {
        return listingFavoriteKey(productOrId.id, colorVariantId);
      }

      return listingFavoriteKeyForProduct(productOrId);
    }

    return listingFavoriteKey(productOrId, colorVariantId);
  },
  parseFavoriteKey(key) {
    return parseListingFavoriteKey(key);
  },
  getIds() {
    syncUserScope();
    return [...favoriteIdsState];
  },
  countItems() {
    syncUserScope();
    return favoriteIdsState.length;
  },
  isFavorite(productOrId, colorVariantId = '') {
    syncUserScope();
    const productKey = this.favoriteKey(productOrId, colorVariantId);
    return productKey ? favoriteIdsState.includes(productKey) : false;
  },
  isPending(productOrId, colorVariantId = '') {
    syncUserScope();
    const productKey = this.favoriteKey(productOrId, colorVariantId);
    return productKey ? pendingFavoriteStates.has(productKey) : false;
  },
  async sync(options = {}) {
    const userId = syncUserScope();
    const shouldForce = Boolean(options.force);
    const scopeVersion = userScopeVersion;

    if (!userId || !authStore.isUser()) {
      return applyFavoriteIds([]);
    }

    if (!shouldForce && isHydrated) {
      return [...favoriteIdsState];
    }

    if (syncPromise) {
      return syncPromise;
    }

    syncPromise = (async () => {
      const response = await wishlistApi.getFavorites();
      if (scopeVersion !== userScopeVersion || userId !== activeUserId) {
        return null;
      }

      if (!response || !Array.isArray(response.ids)) {
        return null;
      }

      return applyServerFavoriteIds(response.ids);
    })();

    try {
      return await syncPromise;
    } finally {
      if (scopeVersion === userScopeVersion) {
        syncPromise = null;
      }
    }
  },
  async toggleItem(productOrId, colorVariantId = '', options = {}) {
    if (!authStore.isUser()) {
      return false;
    }

    const userId = syncUserScope();
    const scopeVersion = userScopeVersion;
    const productKey = this.favoriteKey(productOrId, colorVariantId);
    const { productId, colorVariantId: parsedVariantId } = parseListingFavoriteKey(productKey);

    if (!productId) {
      return false;
    }

    const wasFavorite = favoriteIdsState.includes(productKey);
    if (pendingFavoriteStates.has(productKey)) {
      return pendingFavoriteStates.get(productKey);
    }

    const noticeProduct = options.product || (productOrId && typeof productOrId === 'object' ? productOrId : null);
    const favoriteItem = noticeProduct
      ? {
          ...noticeProduct,
          colorVariantId: parsedVariantId || noticeProduct.colorVariantId || noticeProduct.color_variant_id || ''
        }
      : null;
    const optimisticFavoriteState = !wasFavorite;
    const optimisticIds = wasFavorite
      ? favoriteIdsState.filter(id => id !== productKey)
      : [productKey, ...favoriteIdsState];

    pendingFavoriteStates.set(productKey, optimisticFavoriteState);
    applyFavoriteIds(optimisticIds);
    if (favoriteItem) showFavoriteNoticeDrawer(favoriteItem, optimisticFavoriteState);

    return enqueueFavoriteMutation(async () => {
      if (scopeVersion !== userScopeVersion || userId !== activeUserId) {
        return false;
      }

      const response = await wishlistApi.toggleFavorite(productId, { colorVariantId: parsedVariantId });
      if (scopeVersion !== userScopeVersion || userId !== activeUserId) {
        return false;
      }

      pendingFavoriteStates.delete(productKey);

      if (!response || !Array.isArray(response.ids)) {
        const restoredIds = wasFavorite
          ? [productKey, ...favoriteIdsState.filter(id => id !== productKey)]
          : favoriteIdsState.filter(id => id !== productKey);
        applyFavoriteIds(restoredIds);
        clearFavoriteNotice();
        return wasFavorite;
      }

      const isFavorite = response.ids.includes(productKey);
      applyServerFavoriteIds(response.ids, {
        isFavorite,
        favoriteItem
      });
      if (favoriteItem && isFavorite !== optimisticFavoriteState) {
        showFavoriteNoticeDrawer(favoriteItem, isFavorite);
      }
      return isFavorite;
    });
  },
  async removeItem(productOrId, colorVariantId = '') {
    if (!authStore.isUser()) {
      return applyFavoriteIds([]);
    }

    syncUserScope();
    const productKey = this.favoriteKey(productOrId, colorVariantId);
    const { productId, colorVariantId: parsedVariantId } = parseListingFavoriteKey(productKey);

    if (!productId) {
      return applyFavoriteIds(favoriteIdsState);
    }

    const response = await wishlistApi.removeFavorite(productId, { colorVariantId: parsedVariantId });
    return response && Array.isArray(response.ids)
      ? applyServerFavoriteIds(response.ids)
      : [...favoriteIdsState];
  },
  async clear() {
    const userId = syncUserScope();

    if (!userId || !authStore.isUser()) {
      return applyFavoriteIds([]);
    }

    const response = await wishlistApi.clearFavorites();
    return response && Array.isArray(response.ids)
      ? applyFavoriteIds(response.ids)
      : [...favoriteIdsState];
  },
  invalidate() {
    isHydrated = false;
    syncPromise = null;
  }
};
