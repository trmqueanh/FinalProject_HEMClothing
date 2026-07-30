import { profileApi } from '../api/domains/profileApi';

export const searchApi = {
  getSearchHistory: profileApi.getSearchHistory,
  saveSearchHistory: profileApi.saveSearchHistory,
  clearSearchHistory: profileApi.clearSearchHistory
};
