import { adminApi } from '../services/adminApi';

const ORDER_DETAIL_TTL_MS = 60_000;
const detailCache = new Map();
const pendingRequests = new Map();

const normalizeId = value => String(value || '').trim();

export const readAdminOrderDetail = orderId => {
  const entry = detailCache.get(normalizeId(orderId));
  return entry ? entry.payload : null;
};

export const primeAdminOrderDetail = payload => {
  const orderId = normalizeId(payload && payload.order && payload.order.id);
  if (!orderId) return;

  detailCache.set(orderId, {
    payload,
    cachedAt: Date.now()
  });
};

export const fetchAdminOrderDetail = async (orderId, options = {}) => {
  const normalizedOrderId = normalizeId(orderId);
  if (!normalizedOrderId) return null;

  const cached = detailCache.get(normalizedOrderId);
  const isFresh = cached && Date.now() - cached.cachedAt < ORDER_DETAIL_TTL_MS;

  if (!options.force && isFresh) return cached.payload;
  if (pendingRequests.has(normalizedOrderId)) return pendingRequests.get(normalizedOrderId);

  const request = adminApi.getAdminOrder(normalizedOrderId)
    .then(payload => {
      if (!payload || !payload.order) return null;
      primeAdminOrderDetail(payload);
      return payload;
    })
    .finally(() => {
      pendingRequests.delete(normalizedOrderId);
    });

  pendingRequests.set(normalizedOrderId, request);
  return request;
};
