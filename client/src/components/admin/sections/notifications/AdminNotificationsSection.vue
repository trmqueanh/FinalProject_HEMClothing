<template>
  <section class="admin-panel admin-notification-center">
    <div class="admin-panel__top admin-notification-center__top">
      <div>
        <p class="admin-panel__eyebrow">Notification Center</p>
        <div class="admin-notification-center__title-row">
          <span class="admin-notification-center__unread-count">{{ unreadCount }} unread</span>
        </div>
        <p>{{ filteredNotifications.length }} notifications match the current filters.</p>
      </div>
      <button
        v-if="unreadCount"
        type="button"
        class="admin-notification-center__mark-all"
        @click="markAllRead"
      >
        Mark all as read
      </button>
    </div>

    <div class="admin-toolbar admin-notification-center__toolbar">
      <select v-model="typeFilter" aria-label="Filter notification type">
        <option value="">All notification types</option>
        <option value="new_orders">New orders</option>
        <option value="payment_reviews">Payment reviews</option>
        <option value="delivery_failed">Delivery failed</option>
        <option value="return_requests">Return requests</option>
        <option value="refund_requests">Refunds</option>
        <option value="product_reviews">Product reviews</option>
        <option value="low_stock">Low stock</option>
        <option value="out_of_stock">Out of stock</option>
      </select>
      <select v-model="readFilter" aria-label="Filter notification read status">
        <option value="">All statuses</option>
        <option value="unread">Unread</option>
        <option value="read">Read</option>
      </select>
    </div>

    <div class="admin-notification-center__list" aria-live="polite">
      <p v-if="isLoading" class="admin-empty">Loading notifications...</p>
      <button
        v-for="notification in pagedNotifications"
        v-else
        :key="notification.id"
        type="button"
        class="admin-notification-center__item"
        :class="[
          `admin-notification-center__item--${notification.severity || 'info'}`,
          { 'admin-notification-center__item--unread': !isRead(notification) }
        ]"
        @click="openNotification(notification)"
      >
        <span class="admin-notification-center__status" aria-hidden="true"></span>
        <span class="admin-notification-center__copy">
          <span class="admin-notification-center__heading">
            <strong>{{ notification.title }}</strong>
            <time>{{ formatTime(notification.createdAt) }}</time>
          </span>
          <span>{{ notification.message }}</span>
        </span>
        <span class="admin-notification-center__open" aria-hidden="true">›</span>
      </button>

      <div v-if="!isLoading && !filteredNotifications.length" class="admin-notification-center__empty">
        <span aria-hidden="true">✓</span>
        <strong>No matching notifications</strong>
        <p>Try changing the filters.</p>
      </div>
    </div>

    <nav v-if="totalPages > 1" class="admin-pagination" aria-label="Notification pagination">
      <button type="button" :disabled="page <= 1" @click="page -= 1">Previous</button>
      <span>Page {{ page }} of {{ totalPages }}</span>
      <button type="button" :disabled="page >= totalPages" @click="page += 1">Next</button>
    </nav>
  </section>
</template>

<script>
import { adminApi } from '../../../../services/adminApi';
import { authStore } from '../../../../stores/authStore';

export default {
  name: 'AdminNotificationsSection',
  data() {
    return {
      isLoading: false,
      notifications: [],
      readNotificationIds: [],
      typeFilter: '',
      readFilter: '',
      page: 1,
      pageSize: 15
    };
  },
  computed: {
    storageKey() {
      const user = authStore.getUser() || {};
      return `hem-admin-notifications-read:${String(user.id || user.email || 'admin')}`;
    },
    readIdSet() {
      return new Set(this.readNotificationIds);
    },
    filteredNotifications() {
      return this.notifications.filter(notification => {
        if (this.typeFilter && notification.type !== this.typeFilter) return false;
        const read = this.isRead(notification);
        if (this.readFilter === 'read' && !read) return false;
        if (this.readFilter === 'unread' && read) return false;
        return true;
      });
    },
    totalPages() {
      return Math.max(1, Math.ceil(this.filteredNotifications.length / this.pageSize));
    },
    pagedNotifications() {
      const safePage = Math.min(this.page, this.totalPages);
      const offset = (safePage - 1) * this.pageSize;
      return this.filteredNotifications.slice(offset, offset + this.pageSize);
    },
    unreadCount() {
      return this.notifications.filter(notification => !this.isRead(notification)).length;
    }
  },
  watch: {
    typeFilter() {
      this.page = 1;
    },
    readFilter() {
      this.page = 1;
    },
    totalPages(nextTotalPages) {
      if (this.page > nextTotalPages) this.page = nextTotalPages;
    }
  },
  mounted() {
    this.loadReadIds();
    this.loadNotifications();
    window.addEventListener('admin-notifications-read-updated', this.loadReadIds);
  },
  beforeUnmount() {
    window.removeEventListener('admin-notifications-read-updated', this.loadReadIds);
  },
  methods: {
    loadReadIds() {
      try {
        const value = JSON.parse(window.localStorage.getItem(this.storageKey) || '[]');
        this.readNotificationIds = Array.isArray(value) ? value.map(String) : [];
      } catch {
        this.readNotificationIds = [];
      }
    },
    saveReadIds() {
      try {
        window.localStorage.setItem(this.storageKey, JSON.stringify(this.readNotificationIds));
        window.dispatchEvent(new CustomEvent('admin-notifications-read-updated'));
      } catch {
        // Keep the page usable when browser storage is unavailable.
      }
    },
    async loadNotifications() {
      this.isLoading = true;
      try {
        const payload = await adminApi.getAdminNotifications({ limit: 500 });
        if (payload && Array.isArray(payload.items)) this.notifications = payload.items;
      } finally {
        this.isLoading = false;
      }
    },
    isRead(notification) {
      return this.readIdSet.has(String(notification && notification.id || ''));
    },
    markRead(notification) {
      const id = String(notification && notification.id || '');
      if (!id || this.readIdSet.has(id)) return;
      this.readNotificationIds = [...this.readNotificationIds, id];
      this.saveReadIds();
    },
    markAllRead() {
      this.readNotificationIds = this.notifications.map(notification => String(notification.id || ''));
      this.saveReadIds();
    },
    openNotification(notification) {
      this.markRead(notification);
      this.$router.push(String(notification.target || '/studio'));
    },
    formatTime(value) {
      if (!value) return 'Current';
      const timestamp = new Date(value).getTime();
      if (!Number.isFinite(timestamp)) return 'Current';
      const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}d ago`;
      return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' })
        .format(new Date(timestamp));
    }
  }
};
</script>

<style scoped src="../adminSectionShared.css"></style>
<style scoped>
.admin-notification-center {
  display: grid;
  gap: 20px;
  font-family: var(--font);
}

.admin-notification-center__top {
  align-items: end;
}

.admin-notification-center__top h2,
.admin-notification-center__top p {
  margin: 0;
}

.admin-notification-center__top h2 {
  font-family: var(--font);
  font-size: 22px !important;
}

.admin-notification-center__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
}

.admin-notification-center__unread-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: #e6f3f0;
  color: #0d6b63;
  font-size: 12px;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.admin-notification-center__top .admin-panel__eyebrow {
  font-family: var(--font);
  font-size: 13px !important;
  letter-spacing: 0.14em;
}

.admin-notification-center__top > div > p:last-child {
  margin-top: 7px;
  color: var(--text-secondary);
  font-size: 13px;
}

.admin-notification-center__mark-all {
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid rgba(13, 107, 99, 0.25);
  background: #ffffff;
  color: #0d6b63;
  cursor: pointer;
  font-size: 12px;
  font-weight: 750;
}

.admin-notification-center__toolbar {
  display: grid;
  grid-template-columns: repeat(2, minmax(260px, 1fr));
  gap: 12px;
  width: min(100%, 680px);
}

.admin-notification-center__toolbar select {
  width: 100%;
  min-width: 0;
  padding-right: 44px;
}

.admin-notification-center__list {
  overflow: hidden;
  border: 1px solid var(--card-border);
  background: #ffffff;
}

.admin-notification-center__item {
  position: relative;
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) 24px;
  align-items: center;
  gap: 15px;
  width: 100%;
  min-height: 78px;
  padding: 15px 20px;
  border: 0;
  border-bottom: 1px solid var(--card-border);
  background: #ffffff;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.admin-notification-center__item:hover {
  background: #f8faf9;
}

.admin-notification-center__item--unread {
  background: #f3f8f7;
}

.admin-notification-center__item--unread::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: #0d6b63;
}

.admin-notification-center__status {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #4c8f89;
}

.admin-notification-center__item--warning .admin-notification-center__status {
  background: #d4a017;
}

.admin-notification-center__item--danger .admin-notification-center__status {
  background: #bc3d32;
}

.admin-notification-center__copy {
  display: grid;
  min-width: 0;
  gap: 6px;
  color: var(--text-secondary);
  font-family: var(--font);
  font-size: 14px;
  line-height: 1.4;
}

.admin-notification-center__heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.admin-notification-center__heading strong {
  color: var(--text-primary);
  font-size: 15px;
}

.admin-notification-center__heading time {
  flex-shrink: 0;
  color: var(--text-tertiary);
  font-size: 11px;
}

.admin-notification-center__open {
  color: #8b9a97;
  font-size: 24px;
}

.admin-notification-center__empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 54px 24px;
  color: var(--text-secondary);
  text-align: center;
}

.admin-notification-center__empty > span {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  background: #e6f3f0;
  color: #0d6b63;
  font-weight: 800;
}

.admin-notification-center__empty p {
  margin: 0;
  font-size: 12px;
}

@media (max-width: 900px) {
  .admin-notification-center__toolbar {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 1440px) {
  .admin-notification-center__toolbar {
    grid-template-columns: repeat(2, minmax(300px, 1fr));
    width: min(100%, 760px);
  }

  .admin-notification-center__top .admin-panel__eyebrow {
    font-size: 15px !important;
  }

  .admin-notification-center__top h2 {
    font-size: 26px !important;
  }

  .admin-notification-center__unread-count {
    min-height: 30px;
    padding: 0 12px;
    font-size: 14px;
  }

  .admin-notification-center__top > div > p:last-child {
    font-size: 16px;
  }

  .admin-notification-center__item {
    min-height: 88px;
    padding: 18px 22px;
  }

  .admin-notification-center__copy {
    font-size: 15px;
  }

  .admin-notification-center__heading strong {
    font-size: 16px;
  }

  .admin-notification-center__heading time {
    font-size: 13px;
  }

  .admin-notification-center__mark-all,
  .admin-notification-center .admin-pagination button,
  .admin-notification-center .admin-pagination span {
    font-size: 14px;
  }

  .admin-notification-center__status {
    width: 11px;
    height: 11px;
  }
}

@media (min-width: 1920px) {
  .admin-notification-center__toolbar {
    grid-template-columns: repeat(2, minmax(340px, 1fr));
    width: min(100%, 840px);
  }

  .admin-notification-center {
    gap: 24px;
  }

  .admin-notification-center__top .admin-panel__eyebrow {
    font-size: 16px !important;
  }

  .admin-notification-center__top h2 {
    font-size: 30px !important;
  }

  .admin-notification-center__top > div > p:last-child {
    font-size: 17px;
  }

  .admin-notification-center__item {
    min-height: 98px;
    padding: 20px 26px;
  }

  .admin-notification-center__copy {
    font-size: 16px;
  }

  .admin-notification-center__heading strong {
    font-size: 17px;
  }

  .admin-notification-center__heading time {
    font-size: 14px;
  }

  .admin-notification-center__open {
    font-size: 28px;
  }

  .admin-notification-center__mark-all,
  .admin-notification-center .admin-pagination button,
  .admin-notification-center .admin-pagination span {
    font-size: 15px;
  }

  .admin-notification-center__status {
    width: 12px;
    height: 12px;
  }
}

@media (min-width: 2560px) {
  .admin-notification-center__toolbar {
    grid-template-columns: repeat(2, minmax(400px, 1fr));
    width: min(100%, 980px);
  }

  .admin-notification-center__top .admin-panel__eyebrow {
    font-size: 18px !important;
  }

  .admin-notification-center__top h2 {
    font-size: 34px !important;
  }

  .admin-notification-center__top > div > p:last-child {
    font-size: 18px;
  }

  .admin-notification-center__toolbar input,
  .admin-notification-center__toolbar select {
    min-height: 58px !important;
    font-size: 18px !important;
  }

  .admin-notification-center__item {
    min-height: 112px;
    padding: 24px 30px;
  }

  .admin-notification-center__copy {
    font-size: 18px;
  }

  .admin-notification-center__heading strong {
    font-size: 19px;
  }

  .admin-notification-center__heading time {
    font-size: 16px;
  }

  .admin-notification-center__mark-all,
  .admin-notification-center .admin-pagination button,
  .admin-notification-center .admin-pagination span {
    font-size: 17px;
  }

  .admin-notification-center__status {
    width: 14px;
    height: 14px;
  }
}
</style>
