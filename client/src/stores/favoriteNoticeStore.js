import { reactive } from 'vue';

export const favoriteNoticeState = reactive({
  item: null,
  isFavorite: true
});

let favoriteNoticeTimer = null;

export const clearFavoriteNotice = () => {
  favoriteNoticeState.item = null;

  if (favoriteNoticeTimer) {
    window.clearTimeout(favoriteNoticeTimer);
    favoriteNoticeTimer = null;
  }
};

export const showFavoriteNotice = (item, isFavorite) => {
  if (!item) return;

  favoriteNoticeState.isFavorite = Boolean(isFavorite);
  favoriteNoticeState.item = item;

  if (favoriteNoticeTimer) window.clearTimeout(favoriteNoticeTimer);
  favoriteNoticeTimer = window.setTimeout(() => {
    favoriteNoticeState.item = null;
    favoriteNoticeTimer = null;
  }, 3200);
};
