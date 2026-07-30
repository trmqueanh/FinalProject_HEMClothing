// Quản lý cart state dùng chung và phát event cho header, cart page và checkout.
import { authStore } from '../../stores/authStore';
import { normalizeCartItems } from './cartPayload';

let activeUserId = '';
let activeCartId = '';
let cartItemsState = [];
let selectedCartItemIds = new Set();
let isSelectionHydrated = false;
let isHydrated = false;
let syncPromise = null;

const safeWindow = () => (typeof window !== 'undefined' ? window : null);
const itemId = item => String(item && (item.cartItemId || item.lineId || item.id) || '');
const selectionStorageKey = userId => `hem-cart-selection-v2:${userId}`;

const persistSelection = () => {
  const browserWindow = safeWindow();

  if (!browserWindow || !activeUserId || !isSelectionHydrated) return;

  try {
    browserWindow.sessionStorage.setItem(
      selectionStorageKey(activeUserId),
      JSON.stringify([...selectedCartItemIds])
    );
  } catch {
    // Cart selection still works in memory when storage is unavailable.
  }
};

const hydrateSelection = userId => {
  selectedCartItemIds = new Set();
  isSelectionHydrated = false;

  const browserWindow = safeWindow();
  if (!browserWindow || !userId) return;

  try {
    const storedSelection = browserWindow.sessionStorage.getItem(selectionStorageKey(userId));

    if (storedSelection !== null) {
      const parsedSelection = JSON.parse(storedSelection);
      selectedCartItemIds = new Set(Array.isArray(parsedSelection) ? parsedSelection.map(String) : []);
      isSelectionHydrated = true;
    }
  } catch {
    selectedCartItemIds = new Set();
  }
};

const dispatchCartEvent = (items, detail = {}) => {
  const browserWindow = safeWindow();
  if (!browserWindow) return;

  browserWindow.dispatchEvent(
    new CustomEvent('cart-updated', {
      detail: {
        count: items.reduce((total, item) => total + (item.quantity || 0), 0),
        items: [...items],
        selectedCartItemIds: [...selectedCartItemIds],
        ...detail
      }
    })
  );
};

export const cartState = {
  syncUserScope() {
    const user = authStore.getUser();
    const nextUserId = user ? String(user.id) : '';

    if (nextUserId !== activeUserId) {
      activeUserId = nextUserId;
      activeCartId = '';
      cartItemsState = [];
      hydrateSelection(nextUserId);
      isHydrated = false;
      syncPromise = null;
    }

    return nextUserId;
  },
  clonePayload() {
    return {
      id: activeCartId,
      items: [...cartItemsState]
    };
  },
  applyPayload(payload, detail = {}) {
    const previousItemIds = new Set(cartItemsState.map(itemId).filter(Boolean));
    activeCartId = payload && payload.id ? String(payload.id) : '';
    cartItemsState = normalizeCartItems(payload && payload.items);
    const availableItemIds = new Set(cartItemsState.map(itemId).filter(Boolean));

    if (!isSelectionHydrated) {
      selectedCartItemIds = new Set();
      isSelectionHydrated = true;
    } else {
      selectedCartItemIds = new Set(
        [...selectedCartItemIds].filter(selectedId => availableItemIds.has(selectedId))
      );
    }

    const addedItemId = itemId(detail.addedItem);
    if (addedItemId && availableItemIds.has(addedItemId)) {
      selectedCartItemIds.add(addedItemId);
    } else if (detail.added) {
      availableItemIds.forEach(availableItemId => {
        if (!previousItemIds.has(availableItemId)) selectedCartItemIds.add(availableItemId);
      });
    }

    persistSelection();
    isHydrated = true;
    dispatchCartEvent(cartItemsState, detail);

    return this.clonePayload();
  },
  getItems() {
    this.syncUserScope();
    return [...cartItemsState];
  },
  getSelectedItemIds() {
    this.syncUserScope();
    return [...selectedCartItemIds];
  },
  getSelectedItems() {
    this.syncUserScope();
    return cartItemsState.filter(item => selectedCartItemIds.has(itemId(item)));
  },
  setItemSelected(lineId, selected) {
    this.syncUserScope();
    const normalizedId = String(lineId || '');
    const itemExists = cartItemsState.some(item => itemId(item) === normalizedId);

    if (!normalizedId || !itemExists) return;

    isSelectionHydrated = true;
    if (selected) selectedCartItemIds.add(normalizedId);
    else selectedCartItemIds.delete(normalizedId);
    persistSelection();
    dispatchCartEvent(cartItemsState, { selectionChanged: true });
  },
  setAllItemsSelected(selected) {
    this.syncUserScope();
    isSelectionHydrated = true;
    selectedCartItemIds = selected
      ? new Set(cartItemsState.map(itemId).filter(Boolean))
      : new Set();
    persistSelection();
    dispatchCartEvent(cartItemsState, { selectionChanged: true });
  },
  countItems() {
    this.syncUserScope();
    return cartItemsState.reduce((total, item) => total + (item.quantity || 0), 0);
  },
  getCartId() {
    return activeCartId;
  },
  isHydrated() {
    return isHydrated;
  },
  markHydrated() {
    isHydrated = true;
  },
  getSyncPromise() {
    return syncPromise;
  },
  setSyncPromise(value) {
    syncPromise = value;
  },
  invalidate() {
    isHydrated = false;
    syncPromise = null;
  },
  dispatchCurrent(detail = {}) {
    dispatchCartEvent(cartItemsState, detail);
  }
};
