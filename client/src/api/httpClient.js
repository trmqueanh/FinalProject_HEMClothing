import axios from 'axios';
import { authStore } from '../stores/authStore';
import { flash } from '../helpers/flash';

const apiBaseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_APP_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000
});

apiClient.interceptors.request.use(config => {
  const nextConfig = { ...config };
  const token = authStore.getToken();
  nextConfig.headers = {
    ...config.headers
  };

  if (token) {
    nextConfig.headers.Authorization = `Bearer ${token}`;
  }

  return nextConfig;
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    const code = error && error.response && error.response.data
      ? String(error.response.data.code || '')
      : '';

    if (code === 'ACCOUNT_INACTIVE') {
      authStore.clear();
    }

    return Promise.reject(error);
  }
);

const showErrorMessage = (error, options = {}) => {
  const statusCode = error && error.response ? error.response.status : 'API';
  const message =
    error && error.response && error.response.data && error.response.data.message
      ? error.response.data.message
      : 'Backend is not responding. Please check the API server and database connection.';
  const prefix = options.showStatusCode === false ? '' : `${statusCode}: `;

  flash(`${prefix}${message}`, 'error');
};

// Wraps API calls with the fallback behavior already used throughout the app.
export const withFallback = (fn, fallbackValue, options = {}) => async (...params) => {
  try {
    return await fn(...params);
  } catch (error) {
    const statusCode = error && error.response ? error.response.status : null;
    const isNetworkError = !error || !error.response;
    const shouldSilenceStatus = Array.isArray(options.silentStatuses) && options.silentStatuses.includes(statusCode);
    const shouldSilenceNetwork = Boolean(options.silentNetwork && isNetworkError);

    if (!options.silent && !shouldSilenceStatus && !shouldSilenceNetwork) {
      showErrorMessage(error, options);
    }

    return typeof fallbackValue === 'function' ? fallbackValue() : fallbackValue;
  }
};

export const toErrorPayload = error => ({
  error: true,
  statusCode: error && error.response ? error.response.status : null,
  code:
    error && error.response && error.response.data && error.response.data.code
      ? error.response.data.code
      : '',
  email:
    error && error.response && error.response.data && error.response.data.email
      ? error.response.data.email
      : '',
  message:
    error && error.response && error.response.data && error.response.data.message
      ? error.response.data.message
      : 'Unable to complete the request.'
});
