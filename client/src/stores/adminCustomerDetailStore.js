import { adminApi } from '../services/adminApi';

const CUSTOMER_DETAIL_TTL_MS = 60_000;
const detailCache = new Map();
const summaryCache = new Map();
const pendingRequests = new Map();

const normalizeId = value => String(value || '').trim();
const normalizePage = value => Math.max(1, Number(value) || 1);
const detailKey = (customerId, page) => `${normalizeId(customerId)}:${normalizePage(page)}`;
const readFreshFullEntry = customerId => {
  const prefix = `${normalizeId(customerId)}:`;

  return [...detailCache.entries()]
    .find(([key, entry]) =>
      key.startsWith(prefix) &&
      entry.isFull &&
      Date.now() - entry.cachedAt < CUSTOMER_DETAIL_TTL_MS
    )?.[1] || null;
};

const normalizeSummaryCustomer = account => {
  if (!account || !account.id) return null;

  return {
    id: normalizeId(account.id),
    name: String(account.name || ''),
    email: String(account.email || ''),
    role: String(account.role || 'user'),
    status: String(account.status || 'active'),
    emailVerified: Boolean(account.emailVerified),
    emailVerifiedAt: account.emailVerifiedAt || null,
    createdAt: account.createdAt || null,
    updatedAt: account.updatedAt || null,
    profile: {
      fullName: String(account.fullName || account.name || ''),
      phone: '',
      gender: '',
      birthDate: null
    }
  };
};

export const primeAdminCustomerSummary = account => {
  const customer = normalizeSummaryCustomer(account);
  if (!customer) return;

  summaryCache.set(customer.id, customer);
  detailCache.forEach((entry, key) => {
    if (!key.startsWith(`${customer.id}:`)) return;
    entry.payload = {
      ...entry.payload,
      customer: {
        ...entry.payload.customer,
        ...customer,
        updatedAt: customer.updatedAt || (entry.payload.customer && entry.payload.customer.updatedAt) || null,
        profile: {
          ...customer.profile,
          ...entry.payload.customer && entry.payload.customer.profile
        }
      }
    };
  });
};

export const readAdminCustomerSummary = customerId =>
  summaryCache.get(normalizeId(customerId)) || null;

export const readAdminCustomerDetail = (customerId, page = 1) => {
  const entry = detailCache.get(detailKey(customerId, page));
  if (!entry) return null;
  if (entry.isFull) return entry.payload;

  const fullEntry = readFreshFullEntry(customerId);
  return fullEntry
    ? {
        ...fullEntry.payload,
        ...entry.payload,
        customer: fullEntry.payload.customer,
        statistics: fullEntry.payload.statistics,
        orderStatusSummary: fullEntry.payload.orderStatusSummary
      }
    : entry.payload;
};

export const fetchAdminCustomerDetail = async (customerId, params = {}, options = {}) => {
  const normalizedCustomerId = normalizeId(customerId);
  const page = normalizePage(params.page);
  const key = detailKey(normalizedCustomerId, page);
  const cached = detailCache.get(key);
  const fullEntry = readFreshFullEntry(normalizedCustomerId);
  const isFresh = cached &&
    cached.isFull &&
    Date.now() - cached.cachedAt < CUSTOMER_DETAIL_TTL_MS;

  if (!options.force && isFresh) return cached.payload;
  if (
    !options.force &&
    cached &&
    fullEntry &&
    Date.now() - cached.cachedAt < CUSTOMER_DETAIL_TTL_MS
  ) {
    const payload = {
      ...fullEntry.payload,
      ...cached.payload,
      customer: fullEntry.payload.customer,
      statistics: fullEntry.payload.statistics,
      orderStatusSummary: fullEntry.payload.orderStatusSummary
    };
    detailCache.set(key, {
      payload,
      cachedAt: Math.min(cached.cachedAt, fullEntry.cachedAt),
      isFull: true
    });
    return payload;
  }
  if (pendingRequests.has(key)) {
    if (!options.force) return pendingRequests.get(key);
    try {
      await pendingRequests.get(key);
    } catch {
      // Continue with the forced request below after a stale prefetch fails.
    }
  }

  const request = adminApi.getAdminCustomer(normalizedCustomerId, {
    ...params,
    page
  }).then(payload => {
    if (!payload || !payload.customer) return null;

    detailCache.set(key, {
      payload,
      cachedAt: Date.now(),
      isFull: true
    });
    primeAdminCustomerSummary(payload.customer);
    return payload;
  }).finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, request);
  return request;
};

export const fetchAdminCustomerOrders = async (customerId, params = {}, options = {}) => {
  const normalizedCustomerId = normalizeId(customerId);
  const page = normalizePage(params.page);
  const key = detailKey(normalizedCustomerId, page);
  const cached = detailCache.get(key);
  const isFresh = cached && Date.now() - cached.cachedAt < CUSTOMER_DETAIL_TTL_MS;

  if (!options.force && isFresh) {
    return {
      orders: cached.payload.orders || [],
      pagination: cached.payload.pagination || {}
    };
  }

  const pendingKey = `orders:${key}`;
  if (pendingRequests.has(pendingKey)) {
    if (!options.force) return pendingRequests.get(pendingKey);
    try {
      await pendingRequests.get(pendingKey);
    } catch {
      // Continue with the forced request below after a stale prefetch fails.
    }
  }

  const request = adminApi.getAdminCustomerOrders(normalizedCustomerId, {
    ...params,
    page
  }).then(payload => {
    if (!payload) return null;

    detailCache.set(key, {
      payload: {
        ...cached && cached.payload,
        orders: Array.isArray(payload.orders) ? payload.orders : [],
        pagination: payload.pagination || {}
      },
      cachedAt: Date.now(),
      isFull: Boolean(cached && cached.isFull)
    });
    return payload;
  }).finally(() => {
    pendingRequests.delete(pendingKey);
  });

  pendingRequests.set(pendingKey, request);
  return request;
};
