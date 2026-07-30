import { isValidCartPayload, normalizeCartItems } from '../helpers/cart/cartPayload';
import { cartState } from '../helpers/cart/cartState';
import { cartApi } from '../services/cartApi';
import { authStore } from './authStore';

let optimisticCartLineSequence = 0;
const buyAgainRequests = new Map();

const matchesCartSelection = (item, { product, size, color, colorVariantId }) =>
  String(item.productId || '') === String(product.id || '') &&
  String(item.size || '') === String(size || 'One Size') &&
  (
    colorVariantId
      ? String(item.colorVariantId || '') === String(colorVariantId)
      : String(item.color || '') === String(color || 'Default')
  );

const createOptimisticItem = ({ product, quantity, size, color, colorVariantId }) => {
  optimisticCartLineSequence += 1;
  const lineId = `optimistic-cart-line-${optimisticCartLineSequence}`;

  return normalizeCartItems([{
    ...product,
    lineId,
    cartItemId: lineId,
    productId: product.id,
    quantity,
    size,
    color,
    colorName: color,
    colorVariantId
  }])[0];
};

export const cartStore = {
  getItems() {
    return cartState.getItems();
  },
  countItems() {
    return cartState.countItems();
  },
  getSelectedItemIds() {
    return cartState.getSelectedItemIds();
  },
  getSelectedItems() {
    return cartState.getSelectedItems();
  },
  setItemSelected(lineId, selected) {
    cartState.setItemSelected(lineId, selected);
  },
  setAllItemsSelected(selected) {
    cartState.setAllItemsSelected(selected);
  },
  isHydrated() {
    return cartState.isHydrated();
  },
  async sync(options = {}) {
    const userId = cartState.syncUserScope();
    const shouldForce = Boolean(options.force);

    if (!userId || !authStore.isUser()) {
      return cartState.applyPayload({
        id: null,
        items: []
      });
    }

    if (!shouldForce && cartState.isHydrated()) {
      return cartState.clonePayload();
    }

    if (!shouldForce && cartState.getSyncPromise()) {
      return cartState.getSyncPromise();
    }

    const nextSyncPromise = (async () => {
      const payload = await cartApi.getCart();

      if (!isValidCartPayload(payload)) {
        cartState.markHydrated();
        cartState.dispatchCurrent();
        return cartState.clonePayload();
      }

      return cartState.applyPayload(payload);
    })();
    cartState.setSyncPromise(nextSyncPromise);

    try {
      return await nextSyncPromise;
    } finally {
      cartState.setSyncPromise(null);
    }
  },
  async addItem({ product, quantity, size, color, colorVariantId = '' }) {
    if (!authStore.isUser()) {
      return cartState.applyPayload({
        id: null,
        items: []
      });
    }

    cartState.syncUserScope();
    const previousPayload = cartState.clonePayload();
    const previousItems = normalizeCartItems(previousPayload.items);
    const existingItem = previousItems.find(item => matchesCartSelection(item, {
      product,
      size,
      color,
      colorVariantId
    }));
    const optimisticItem = existingItem
      ? {
          ...existingItem,
          quantity: Number(existingItem.quantity || 0) + Number(quantity || 0)
        }
      : createOptimisticItem({ product, quantity, size, color, colorVariantId });
    const optimisticItems = existingItem
      ? previousItems.map(item => item === existingItem ? optimisticItem : item)
      : [optimisticItem, ...previousItems];

    cartState.applyPayload({
      id: previousPayload.id,
      items: optimisticItems
    }, {
      added: true,
      addedItem: optimisticItem,
      optimistic: true,
      silentNotice: true
    });

    const payload = await cartApi.addCartItem({
      productId: product.id,
      quantity,
      size,
      color,
      colorVariantId
    });
    const nextItems = normalizeCartItems(payload && payload.items);
    const addedItem = nextItems.find(item => matchesCartSelection(item, {
      product,
      size,
      color,
      colorVariantId
    }));

    if (!payload || !Array.isArray(payload.items) || !addedItem) {
      return cartState.applyPayload(previousPayload);
    }

    return cartState.applyPayload(payload, {
      added: true,
      addedItem
    });
  },
  async buyAgainOrderItem(orderId, orderItemId) {
    if (!authStore.isUser()) {
      return {
        cart: cartState.applyPayload({
          id: null,
          items: []
        }),
        message: ''
      };
    }

    const requestKey = `${String(orderId)}:${String(orderItemId)}`;
    if (buyAgainRequests.has(requestKey)) {
      return buyAgainRequests.get(requestKey);
    }

    const request = (async () => {
      cartState.syncUserScope();
      const previousPayload = cartState.clonePayload();
      const response = await cartApi.buyAgainOrderItem(orderId, orderItemId);

      if (!response || !isValidCartPayload(response.cart)) {
        cartState.applyPayload(previousPayload);
        return response;
      }

      cartState.applyPayload(response.cart, {
        added: Number(response.addedQuantity || 0) > 0
      });
      return response;
    })();

    buyAgainRequests.set(requestKey, request);
    try {
      return await request;
    } finally {
      if (buyAgainRequests.get(requestKey) === request) {
        buyAgainRequests.delete(requestKey);
      }
    }
  },
  async buyAgainOrderItems(orderId, items) {
    if (!authStore.isUser()) {
      return {
        cart: cartState.applyPayload({ id: null, items: [] }),
        message: ''
      };
    }

    const requestKey = `${String(orderId)}:batch`;
    if (buyAgainRequests.has(requestKey)) return buyAgainRequests.get(requestKey);

    const request = (async () => {
      cartState.syncUserScope();
      const previousPayload = cartState.clonePayload();
      const response = await cartApi.buyAgainOrderItems(orderId, { items });

      if (!response || !isValidCartPayload(response.cart)) {
        cartState.applyPayload(previousPayload);
        return response;
      }

      cartState.applyPayload(response.cart, {
        added: Number(response.addedQuantity || 0) > 0
      });
      return response;
    })();

    buyAgainRequests.set(requestKey, request);
    try {
      return await request;
    } finally {
      if (buyAgainRequests.get(requestKey) === request) buyAgainRequests.delete(requestKey);
    }
  },
  async updateQuantity(lineId, quantity) {
    if (!authStore.isUser()) {
      return cartState.applyPayload({
        id: null,
        items: []
      });
    }

    cartState.syncUserScope();
    const previousPayload = cartState.clonePayload();
    const payload = await cartApi.updateCartItem(lineId, { quantity });

    if (!isValidCartPayload(payload)) {
      return cartState.applyPayload(previousPayload);
    }

    return cartState.applyPayload(payload);
  },
  async removeItem(lineId) {
    if (!authStore.isUser()) {
      return cartState.applyPayload({
        id: null,
        items: []
      });
    }

    cartState.syncUserScope();
    const previousPayload = cartState.clonePayload();
    const nextItems = cartState.getItems().filter(
      item =>
        String(item.lineId || '') !== String(lineId) &&
        String(item.cartItemId || '') !== String(lineId)
    );

    cartState.applyPayload({
      id: cartState.getCartId(),
      items: nextItems
    });

    const payload = await cartApi.removeCartItem(lineId);

    if (!isValidCartPayload(payload)) {
      return cartState.applyPayload(previousPayload);
    }

    return cartState.applyPayload(payload);
  },
  async clear() {
    const userId = cartState.syncUserScope();

    if (!userId || !authStore.isUser()) {
      return cartState.applyPayload({
        id: null,
        items: []
      });
    }

    const previousPayload = cartState.clonePayload();
    cartState.applyPayload({
      id: cartState.getCartId(),
      items: []
    });

    const payload = await cartApi.clearCart();

    if (!isValidCartPayload(payload)) {
      return cartState.applyPayload(previousPayload);
    }

    return cartState.applyPayload(payload);
  },
  async checkout(payload) {
    const userId = cartState.syncUserScope();

    if (!userId || !authStore.isUser()) {
      return null;
    }

    const response = await cartApi.checkoutOrder(payload);

    if (response && response.cart) {
      cartState.applyPayload(response.cart);
    }

    return response;
  },
  invalidate() {
    cartState.invalidate();
  }
};
