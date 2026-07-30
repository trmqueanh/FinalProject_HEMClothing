<template>
  <section class="admin-layout">
    <!-- AdminShell: khung ngoài của Studio, giữ sidebar/topbar để view cha chỉ tập trung nội dung. -->
    <aside class="admin-sidebar">
      <div class="admin-brand">
        <a href="/studio" aria-label="Open HEM Studio dashboard" @click.prevent="openDashboard">
          <img src="/hem-logo.svg" alt="HEM logo" />
        </a>
      </div>

      <nav class="admin-sidebar-nav" aria-label="Studio navigation">
        <template v-for="section in sections" :key="section.key">
          <div v-if="section.key === 'products'" class="admin-sidebar-product-group">
            <button
              type="button"
              class="admin-sidebar__button admin-sidebar__button--group"
              :class="{ 'admin-sidebar__button--active': currentSection === 'products' }"
              @click="$emit('toggle-product-menu')"
            >
              <span class="admin-sidebar__icon">{{ section.icon }}</span>
              <span>{{ section.label }}</span>
              <span class="admin-sidebar__chevron" :class="{ 'admin-sidebar__chevron--open': isProductMenuOpen }">⌄</span>
            </button>

            <div v-show="isProductMenuOpen" class="admin-sidebar-subnav">
              <button
                type="button"
                :class="{ 'admin-sidebar-subnav__button--active': currentSection === 'products' && productPanelMode === 'products' }"
                @click="$emit('select-product-mode', 'products')"
              >
                All Products
              </button>
              <button
                type="button"
                :class="{ 'admin-sidebar-subnav__button--active': currentSection === 'products' && productPanelMode === 'stock' }"
                @click="$emit('select-product-mode', 'stock')"
              >
                Stock Products
              </button>
              <button
                type="button"
                :class="{ 'admin-sidebar-subnav__button--active': currentSection === 'products' && productPanelMode === 'reviews' }"
                @click="$emit('select-product-mode', 'reviews')"
              >
                Product Review
              </button>
            </div>
          </div>

          <button
            v-else
            type="button"
            class="admin-sidebar__button"
            :class="{ 'admin-sidebar__button--active': currentSection === section.key }"
            @click="$emit('set-section', section.key)"
          >
            <span class="admin-sidebar__icon">{{ section.icon }}</span>
            <span>{{ section.label }}</span>
          </button>
        </template>
      </nav>

      <div class="admin-sidebar-footer">
        <button type="button" class="admin-sidebar-logout" @click="$emit('request-logout')">
          <span>Sign Out</span>

          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M8 12H19" />
            <path d="M15 8L19 12L15 16" />
          </svg>
        </button>
      </div>
    </aside>

    <main class="admin-content">
      <header class="admin-topbar">
        <div class="admin-topbar__actions">
          <div ref="notificationRoot" class="admin-notifications">
            <button
              type="button"
              class="admin-notifications__trigger"
              :class="{ 'admin-notifications__trigger--active': isNotificationOpen }"
              :aria-expanded="String(isNotificationOpen)"
              aria-haspopup="dialog"
              :aria-label="notificationButtonLabel"
              @click="toggleNotifications"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>
              <span v-if="unreadActionCount" class="admin-notifications__badge">
                {{ notificationBadge }}
              </span>
            </button>

            <transition name="admin-notifications-popover">
              <section
                v-if="isNotificationOpen"
                class="admin-notifications__popover"
                role="dialog"
                aria-label="Admin notifications"
              >
                <header class="admin-notifications__header">
                  <div>
                    <h2>Notifications</h2>
                  </div>
                  <button
                    v-if="unreadActionCount"
                    type="button"
                    @click="markAllNotificationsRead"
                  >
                    Mark all as read
                  </button>
                </header>

                <div class="admin-notifications__body">
                  <p v-if="isNotificationLoading" class="admin-notifications__empty">
                    Loading notifications...
                  </p>
                  <button
                    v-for="notification in visibleNotifications"
                    v-else
                    :key="notification.id"
                    type="button"
                    class="admin-notifications__item"
                    :class="[
                      `admin-notifications__item--${notification.severity || 'info'}`,
                      { 'admin-notifications__item--unread': !isNotificationRead(notification) }
                    ]"
                    @click="openNotification(notification)"
                  >
                    <span class="admin-notifications__status" aria-hidden="true"></span>
                    <span class="admin-notifications__copy">
                      <span class="admin-notifications__item-top">
                        <strong>{{ notification.title }}</strong>
                        <small>{{ formatNotificationTime(notification.createdAt) }}</small>
                      </span>
                      <span>{{ notification.message }}</span>
                    </span>
                    <span class="admin-notifications__open" aria-hidden="true">›</span>
                  </button>

                  <div
                    v-if="!isNotificationLoading && !notifications.length"
                    class="admin-notifications__empty admin-notifications__empty--ready"
                  >
                    <span aria-hidden="true">✓</span>
                    <strong>You're all caught up</strong>
                    <p>No admin action needs attention right now.</p>
                  </div>
                </div>

                <footer v-if="notifications.length" class="admin-notifications__footer">
                  <span>{{ unreadActionCount ? `${unreadActionCount} actions unread` : 'All notifications read' }}</span>
                  <button type="button" @click="openAllNotifications">
                    View all notifications
                  </button>
                </footer>
              </section>
            </transition>
          </div>

          <div class="admin-profile-chip">
            <span>{{ currentUserInitials }}</span>
            <div class="admin-profile-chip__content">
              <strong>{{ currentUser.name || 'Admin' }}</strong>
              <small>Administrator</small>
            </div>
          </div>
        </div>
      </header>

      <slot />
    </main>

  </section>
</template>

<script>
import { adminApi } from '../../../services/adminApi';

export default {
  name: 'AdminShell',
  emits: ['request-logout', 'select-product-mode', 'set-section', 'toggle-product-menu'],
  props: {
    currentSection: {
      type: String,
      required: true
    },
    currentUser: {
      type: Object,
      required: true
    },
    currentUserInitials: {
      type: String,
      required: true
    },
    isProductMenuOpen: {
      type: Boolean,
      required: true
    },
    productPanelMode: {
      type: String,
      required: true
    },
    sections: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      isNotificationLoading: false,
      isNotificationOpen: false,
      notifications: [],
      readNotificationIds: [],
      notificationRefreshTimer: null
    };
  },
  computed: {
    notificationStorageKey() {
      const userId = String(this.currentUser && (this.currentUser.id || this.currentUser.email) || 'admin');
      return `hem-admin-notifications-read:${userId}`;
    },
    readNotificationIdSet() {
      return new Set(this.readNotificationIds);
    },
    unreadActionCount() {
      return this.notifications.reduce((total, notification) => (
        this.isNotificationRead(notification) ? total : total + Math.max(1, Number(notification.count || 0))
      ), 0);
    },
    notificationBadge() {
      return this.unreadActionCount > 99 ? '99+' : String(this.unreadActionCount);
    },
    notificationButtonLabel() {
      if (!this.unreadActionCount) return 'Open notifications';
      return `Open notifications, ${this.unreadActionCount} unread actions`;
    },
    visibleNotifications() {
      return this.notifications.slice(0, 10);
    }
  },
  mounted() {
    this.loadReadNotificationIds();
    this.loadNotifications();
    this.notificationRefreshTimer = window.setInterval(this.loadNotifications, 60000);
    window.addEventListener('focus', this.loadNotifications);
    window.addEventListener('admin-notifications-read-updated', this.loadReadNotificationIds);
    document.addEventListener('click', this.handleNotificationOutsideClick);
    document.addEventListener('keydown', this.handleNotificationKeydown);
  },
  beforeUnmount() {
    window.clearInterval(this.notificationRefreshTimer);
    window.removeEventListener('focus', this.loadNotifications);
    window.removeEventListener('admin-notifications-read-updated', this.loadReadNotificationIds);
    document.removeEventListener('click', this.handleNotificationOutsideClick);
    document.removeEventListener('keydown', this.handleNotificationKeydown);
  },
  methods: {
    loadReadNotificationIds() {
      try {
        const storedIds = JSON.parse(window.localStorage.getItem(this.notificationStorageKey) || '[]');
        this.readNotificationIds = Array.isArray(storedIds) ? storedIds.map(String) : [];
      } catch {
        this.readNotificationIds = [];
      }
    },
    saveReadNotificationIds() {
      try {
        window.localStorage.setItem(
          this.notificationStorageKey,
          JSON.stringify(this.readNotificationIds)
        );
        window.dispatchEvent(new CustomEvent('admin-notifications-read-updated'));
      } catch {
        // Notifications still work when browser storage is unavailable.
      }
    },
    async loadNotifications() {
      this.isNotificationLoading = !this.notifications.length;
      try {
        const payload = await adminApi.getAdminNotifications({ limit: 500 });
        if (!payload || !Array.isArray(payload.items)) return;
        this.notifications = payload.items;
        const activeIds = new Set(this.notifications.map(item => String(item.id || '')));
        const nextReadIds = this.readNotificationIds.filter(id => activeIds.has(id));

        if (nextReadIds.length !== this.readNotificationIds.length) {
          this.readNotificationIds = nextReadIds;
          this.saveReadNotificationIds();
        }
      } finally {
        this.isNotificationLoading = false;
      }
    },
    toggleNotifications() {
      this.isNotificationOpen = !this.isNotificationOpen;
      if (this.isNotificationOpen) this.loadNotifications();
    },
    isNotificationRead(notification) {
      return this.readNotificationIdSet.has(String(notification && notification.id || ''));
    },
    markNotificationRead(notification) {
      const notificationId = String(notification && notification.id || '');
      if (!notificationId || this.readNotificationIdSet.has(notificationId)) return;
      this.readNotificationIds = [...this.readNotificationIds, notificationId];
      this.saveReadNotificationIds();
    },
    markAllNotificationsRead() {
      this.readNotificationIds = this.notifications.map(notification => String(notification.id || ''));
      this.saveReadNotificationIds();
    },
    openNotification(notification) {
      this.markNotificationRead(notification);
      this.isNotificationOpen = false;
      const target = String(notification && notification.target || '/studio');
      if (this.$route.fullPath === target) return;
      this.$router.push(target);
    },
    openAllNotifications() {
      this.isNotificationOpen = false;
      if (this.$route.path !== '/studio/notifications') this.$router.push('/studio/notifications');
    },
    handleNotificationOutsideClick(event) {
      if (!this.isNotificationOpen || !this.$refs.notificationRoot) return;
      if (!this.$refs.notificationRoot.contains(event.target)) this.isNotificationOpen = false;
    },
    handleNotificationKeydown(event) {
      if (event.key === 'Escape') this.isNotificationOpen = false;
    },
    formatNotificationTime(value) {
      if (!value) return 'Current';
      const timestamp = new Date(value).getTime();
      if (!Number.isFinite(timestamp)) return 'Current';
      const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
      if (elapsedMinutes < 1) return 'Just now';
      if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
      const elapsedHours = Math.floor(elapsedMinutes / 60);
      if (elapsedHours < 24) return `${elapsedHours}h ago`;
      const elapsedDays = Math.floor(elapsedHours / 24);
      if (elapsedDays < 7) return `${elapsedDays}d ago`;
      return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(timestamp));
    },
    openDashboard() {
      if (this.$route.path === '/studio' && this.$route.fullPath === '/studio') {
        this.$router.go(0);
        return;
      }

      this.$router.push('/studio');
    }
  }
};
</script>

<style scoped>
/* AdminShell styles: giữ layout, sidebar và topbar của Studio ngay trong component shell. */
.admin-layout {
  display: block;
  min-height: 100vh;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  padding-left: var(--nav-width);
}

.admin-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 40;
  width: var(--nav-width);
  height: 100vh;
  min-height: 100vh;
  flex: 0 0 var(--nav-width);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 10px;
  padding: 20px 14px;
  background: linear-gradient(180deg, #b39b85 0%, #a58c74 50%, #967c64 100%);
  border-right: 1px solid rgba(0,0,0,0.08);
  overflow: hidden;
  overscroll-behavior: contain;
}

.admin-sidebar-nav {
  min-height: 0;
  display: grid;
  align-content: start;
  gap: 2px;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding-right: 2px;
  scrollbar-width: none;
}

.admin-sidebar-nav::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.admin-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0 24px;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}

.admin-brand img {
  display: block;
  width: 180px;
  height: auto;
  max-width: 100%;
  object-fit: contain;
  background: transparent;
  border-radius: 0;
  padding: 0;
}

.admin-sidebar__button {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: rgba(255,255,255,0.8);
  font-family: var(--font);
  font-size: 13.5px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  position: relative;
}

.admin-sidebar__button:hover {
  background: rgba(255,255,255,0.12);
  color: #ffffff;
}

.admin-sidebar__button--active {
  background: rgba(255,255,255,0.2);
  color: #ffffff;
  font-weight: 700;
  box-shadow: none;
}

.admin-sidebar__button--active::before {
  display: none;
}

.admin-sidebar__icon {
  font-size: 15px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
  opacity: 1;
}

.admin-sidebar__button small {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.07);
  padding: 2px 7px;
  border-radius: 99px;
}

.admin-sidebar__button--active small {
  color: rgba(255,255,255,0.7);
  background: rgba(255,255,255,0.18);
}

.admin-sidebar-product-group {
  display: grid;
  gap: 6px;
}

.admin-sidebar__button--group {
  min-height: 48px;
}

.admin-sidebar__chevron {
  margin-left: auto;
  color: rgba(255,255,255,0.72);
  font-size: 18px;
  line-height: 1;
  transition: transform 0.18s ease;
}

.admin-sidebar__chevron--open {
  transform: rotate(180deg);
}

.admin-sidebar-subnav {
  position: relative;
  display: grid;
  gap: 10px;
  margin: 4px 0 10px 24px;
  padding: 4px 0 4px 20px;
}

.admin-sidebar-subnav::before {
  content: '';
  position: absolute;
  left: 3px;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 999px;
  background: rgba(255,255,255,0.18);
}

.admin-sidebar-subnav button {
  position: relative;
  width: 100%;
  padding: 6px 10px 6px 28px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: rgba(255,255,255,0.58);
  font-family: var(--font);
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: color 0.14s ease, background 0.14s ease;
}

.admin-sidebar-subnav button::before {
  content: '';
  position: absolute;
  left: 9px;
  top: 50%;
  width: 7px;
  height: 7px;
  transform: translateY(-50%);
  border-radius: 50%;
  background: rgba(255,255,255,0.28);
  transition: background 0.14s ease, box-shadow 0.14s ease;
}

.admin-sidebar-subnav button:hover {
  color: #ffffff;
  background: rgba(255,255,255,0.08);
}

.admin-sidebar-subnav__button--active {
  color: #ffffff !important;
  font-weight: 700;
  background: rgba(255,255,255,0.16) !important;
}

.admin-sidebar-subnav__button--active::before {
  width: 8px;
  height: 8px;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(255,255,255,0.22);
}

.admin-sidebar-subnav button:focus,
.admin-sidebar-subnav button:focus-visible {
  outline: none;
  box-shadow: none !important;
}

.admin-sidebar-footer {
  display: grid;
  gap: 10px;
  margin-top: 0;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.12);
}

.admin-sidebar-logout {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: 1px solid var(--color-border-default);
  border-radius: 10px;
  background: transparent;
  color: var(--color-text-secondary);
  font-family: var(--font);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease;
}

.admin-sidebar-logout svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 180ms ease;
}

.admin-sidebar-logout:hover {
  color: #b42318;
  border-color: rgba(180, 35, 24, 0.2);
  background: rgba(180, 35, 24, 0.04);
}

.admin-sidebar-logout:hover svg {
  transform: translateX(2px);
}

.admin-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0 32px 40px;
  min-height: 100vh;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  background: var(--page-bg);
}

.admin-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 0 -32px;
  padding: 14px 32px;
  border-bottom: 1px solid var(--card-border);
  position: sticky;
  top: 0;
  overflow: visible;
  background: #ffffff !important;
  background-color: #ffffff !important;
  z-index: 3000;
  isolation: isolate;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  box-shadow: 0 10px 24px rgba(13,59,56,0.04);
  transform: translateZ(0);
}

.admin-topbar::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: #ffffff;
  pointer-events: none;
}

.admin-topbar > * {
  position: relative;
  z-index: 1;
}

.admin-topbar__actions {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-left: auto;
}

.admin-notifications {
  position: relative;
  flex-shrink: 0;
}

.admin-notifications__trigger {
  position: relative;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: 1px solid rgba(13, 59, 56, 0.1);
  border-radius: 12px;
  background: #ffffff;
  color: #223331;
  box-shadow: 0 2px 8px rgba(13, 59, 56, 0.05);
  cursor: pointer;
  transition: border-color 150ms ease, background 150ms ease, transform 150ms ease;
}

.admin-notifications__trigger:hover,
.admin-notifications__trigger--active {
  border-color: rgba(13, 107, 99, 0.3);
  background: #f4f9f8;
}

.admin-notifications__trigger:hover {
  transform: translateY(-1px);
}

.admin-notifications__trigger:focus-visible {
  outline: 2px solid #0d6b63;
  outline-offset: 3px;
}

.admin-notifications__trigger svg {
  width: 23px;
  height: 23px;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.admin-notifications__badge {
  position: absolute;
  top: -6px;
  right: -7px;
  display: grid;
  place-items: center;
  min-width: 21px;
  height: 21px;
  padding: 0 5px;
  border: 2px solid #ffffff;
  border-radius: 999px;
  background: #bc3d32;
  color: #ffffff;
  font-size: 9px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.admin-notifications__popover {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  z-index: 50;
  width: min(680px, calc(100vw - 32px));
  overflow: hidden;
  border: 1px solid rgba(17, 24, 39, 0.1);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 24px 70px rgba(20, 35, 33, 0.18);
  color: #142321;
}

.admin-notifications__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 18px 15px;
  border-bottom: 1px solid rgba(17, 24, 39, 0.08);
}

.admin-notifications__header span {
  display: block;
  margin-bottom: 3px;
  color: #9a7d64;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.admin-notifications__header h2 {
  margin: 0;
  color: #10211f;
  font-size: 22px;
  font-weight: 750;
  letter-spacing: -0.02em;
}

.admin-notifications__header button {
  padding: 5px 0;
  border: 0;
  background: transparent;
  color: #0d6b63;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

.admin-notifications__header button:hover {
  color: #084c47;
  text-decoration: underline;
}

.admin-notifications__body {
  max-height: min(760px, calc(100vh - 190px));
  overflow-y: auto;
  overscroll-behavior: contain;
}

.admin-notifications__item {
  position: relative;
  display: grid;
  grid-template-columns: 9px minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
  width: 100%;
  min-height: 82px;
  padding: 17px 20px;
  border: 0;
  border-bottom: 1px solid rgba(17, 24, 39, 0.06);
  background: #ffffff;
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 120ms ease;
}

.admin-notifications__item:hover {
  background: #f7faf9;
}

.admin-notifications__item:focus-visible {
  z-index: 1;
  outline: 2px solid #0d6b63;
  outline-offset: -3px;
}

.admin-notifications__item--unread {
  background: #f3f8f7;
}

.admin-notifications__item--unread::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
  background: #0d6b63;
}

.admin-notifications__status {
  width: 9px;
  height: 9px;
  margin-top: 5px;
  border-radius: 999px;
  background: #4c8f89;
}

.admin-notifications__item--warning .admin-notifications__status {
  background: #d4a017;
}

.admin-notifications__item--danger .admin-notifications__status {
  background: #bc3d32;
}

.admin-notifications__copy {
  display: grid;
  min-width: 0;
  gap: 5px;
  color: #667572;
  font-family: var(--font);
  font-size: 14px;
  line-height: 1.45;
}

.admin-notifications__item-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.admin-notifications__item-top strong {
  min-width: 0;
  overflow: hidden;
  color: #172624;
  font-size: 15px;
  font-weight: 750;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-notifications__item-top small {
  flex-shrink: 0;
  color: #9aa6a3;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.admin-notifications__open {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  color: #8b9a97;
  font-size: 24px;
  line-height: 1;
}

.admin-notifications__empty {
  margin: 0;
  padding: 28px 18px;
  color: #7b8986;
  font-size: 12px;
  text-align: center;
}

.admin-notifications__empty--ready {
  display: grid;
  justify-items: center;
  gap: 7px;
  padding: 36px 24px;
}

.admin-notifications__empty--ready > span {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  margin-bottom: 3px;
  border-radius: 999px;
  background: #e6f3f0;
  color: #0d6b63;
  font-size: 16px;
  font-weight: 800;
}

.admin-notifications__empty--ready strong {
  color: #263633;
  font-size: 13px;
}

.admin-notifications__empty--ready p {
  margin: 0;
}

.admin-notifications__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 18px;
  border-top: 1px solid rgba(17, 24, 39, 0.08);
  background: #fbfcfc;
  color: #86928f;
  font-size: 12px;
  font-weight: 650;
  text-align: left;
}

.admin-notifications__footer button {
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: #0d6b63;
  cursor: pointer;
  font: inherit;
  font-weight: 800;
}

.admin-notifications__footer button:hover {
  color: #084c47;
  text-decoration: underline;
}

@media (min-width: 1600px) {
  .admin-notifications__popover {
    width: 760px;
  }

  .admin-notifications__header {
    padding: 20px 22px 17px;
  }

  .admin-notifications__header h2 {
    font-size: 24px;
  }

  .admin-notifications__item {
    min-height: 92px;
    padding: 20px 24px;
  }

  .admin-notifications__copy {
    font-size: 15px;
  }

  .admin-notifications__item-top strong {
    font-size: 16px;
  }

  .admin-notifications__status {
    width: 11px;
    height: 11px;
  }
}

@media (min-width: 1920px) {
  .admin-notifications__trigger {
    width: 54px;
    height: 54px;
  }

  .admin-notifications__trigger svg {
    width: 26px;
    height: 26px;
  }

  .admin-notifications__popover {
    width: 840px;
  }

  .admin-notifications__header {
    padding: 22px 26px 19px;
  }

  .admin-notifications__header h2 {
    font-size: 27px;
  }

  .admin-notifications__header button {
    font-size: 15px;
  }

  .admin-notifications__item {
    min-height: 102px;
    padding: 22px 26px;
  }

  .admin-notifications__copy {
    font-size: 16px;
  }

  .admin-notifications__item-top strong {
    font-size: 17px;
  }

  .admin-notifications__item-top small {
    font-size: 14px;
  }

  .admin-notifications__status {
    width: 12px;
    height: 12px;
  }

  .admin-notifications__footer {
    padding: 15px 24px;
    font-size: 14px;
  }
}

@media (min-width: 2560px) {
  .admin-notifications__trigger {
    width: 62px;
    height: 62px;
  }

  .admin-notifications__trigger svg {
    width: 30px;
    height: 30px;
  }

  .admin-notifications__popover {
    width: 980px;
  }

  .admin-notifications__header h2 {
    font-size: 31px;
  }

  .admin-notifications__header button {
    font-size: 17px;
  }

  .admin-notifications__item {
    min-height: 116px;
    padding: 25px 30px;
  }

  .admin-notifications__copy {
    font-size: 18px;
  }

  .admin-notifications__item-top strong {
    font-size: 19px;
  }

  .admin-notifications__item-top small {
    font-size: 16px;
  }

  .admin-notifications__status {
    width: 14px;
    height: 14px;
  }

  .admin-notifications__footer {
    padding: 17px 28px;
    font-size: 16px;
  }
}

.admin-notifications-popover-enter-active,
.admin-notifications-popover-leave-active {
  transition: opacity 140ms ease, transform 140ms ease;
  transform-origin: top right;
}

.admin-notifications-popover-enter-from,
.admin-notifications-popover-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

.admin-profile-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px 6px 6px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid rgba(13, 59, 56, 0.08);
  box-shadow: 0 2px 8px rgba(13,59,56,0.06);
}

.admin-profile-chip > span {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #1a9e8f, #0d6b63);
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: -0.02em;
  flex-shrink: 0;
}

.admin-profile-chip__content {
  display: flex;
  flex-direction: column;
}

.admin-profile-chip__content strong {
  color: #111827;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
}

.admin-profile-chip__content small {
  margin-top: 2px;
  color: #9ca3af;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1;
}

@media (max-width: 1180px) {
  .admin-layout {
    padding-left: var(--nav-width);
  }
}

@media (max-width: 900px) {
  .admin-layout {
    padding-left: 0;
  }

  .admin-sidebar {
    position: static;
    width: auto;
    height: auto;
    min-height: auto;
    flex: initial;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    padding: 12px;
    gap: 4px;
    overflow: visible;
  }

  .admin-sidebar-nav {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    overflow: visible;
    padding-right: 0;
  }

  .admin-brand {
    width: 100%;
    padding-bottom: 10px;
  }

  .admin-sidebar-footer {
    width: 100%;
    padding-top: 8px;
    border-top: 0;
  }

  .admin-sidebar__label {
    display: none;
  }

  .admin-sidebar__button {
    flex: 1;
    min-width: 120px;
  }

  .admin-sidebar__button small {
    display: none;
  }

  .admin-content {
    padding: 0 16px 32px;
  }

  .admin-topbar {
    margin: 0 -16px;
    padding-right: 16px;
    padding-left: 16px;
  }
}

@media (max-width: 640px) {
  .admin-topbar {
    flex-wrap: wrap;
  }

  .admin-topbar__actions {
    gap: 9px;
  }

  .admin-profile-chip__content {
    display: none;
  }

  .admin-profile-chip {
    padding: 5px;
  }

  .admin-notifications__popover {
    right: -58px;
  }
}
</style>
