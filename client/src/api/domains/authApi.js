import { apiClient, toErrorPayload, withFallback } from '../httpClient';

// Authentication and password endpoints.
export const authApi = {
  checkEmail: withFallback(async payload => {
    const response = await apiClient.post('/auth/check-email', payload);
    return response.data;
  }, null),
  register: withFallback(async payload => {
    const response = await apiClient.post('/auth/register', payload);
    return response.data;
  }, null),
  login: async payload => {
    try {
      const response = await apiClient.post('/auth/login', payload);
      return response.data;
    } catch (error) {
      return toErrorPayload(error);
    }
  },
  verifyEmail: async payload => {
    try {
      const response = await apiClient.post('/auth/email/verify', payload);
      return response.data;
    } catch (error) {
      return toErrorPayload(error);
    }
  },
  resendEmailVerification: async payload => {
    try {
      const response = await apiClient.post('/auth/email/resend', payload);
      return response.data;
    } catch (error) {
      return toErrorPayload(error);
    }
  },
  requestPasswordReset: withFallback(async payload => {
    const response = await apiClient.post('/auth/password/forgot', payload);
    return response.data;
  }, null),
  resetPassword: async payload => {
    try {
      const response = await apiClient.post('/auth/password/reset', payload);
      return response.data;
    } catch (error) {
      return toErrorPayload(error);
    }
  },
  changePassword: async payload => {
    try {
      const response = await apiClient.patch('/api/account/password', payload);
      return response.data;
    } catch (error) {
      return toErrorPayload(error);
    }
  },
  getCurrentUser: withFallback(async () => {
    const response = await apiClient.get('/auth/me');
    return response.data && response.data.user ? response.data.user : null;
  }, null, {
    silentStatuses: [401]
  })
};
