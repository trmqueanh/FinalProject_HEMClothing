<template>
  <div id="app" :class="{ 'app--admin': isAdminShell, 'app--shop': !isAdminShell }">
    <div v-if="isAuthInitializing" class="app-auth-loading" role="status" aria-live="polite">
      <span>Loading</span>
    </div>

    <router-view v-else />
  </div>
</template>

<script>
import { authStore } from './stores/authStore';
import { authApi } from './services/authApi';

export default {
  name: 'App',
  data() {
    return {
      isAuthInitializing: false
    };
  },
  computed: {
    isAdminShell() {
      return this.$route.path === '/admin' || this.$route.path.startsWith('/studio');
    }
  },
  watch: {
    '$route.fullPath'() {
      this.syncShellClass();
    }
  },
  created() {
    this.syncShellClass();
    this.isAuthInitializing = this.shouldBlockInitialRender();

    const bootstrapPromise = this.bootstrapAuth();

    if (this.isAuthInitializing) {
      return bootstrapPromise;
    }

    return null;
  },
  beforeUnmount() {
    this.syncShellClass(false);
  },
  methods: {
    syncShellClass(forceState) {
      if (typeof document === 'undefined') return;

      const isAdminShell = typeof forceState === 'boolean' ? forceState : this.isAdminShell;
      document.documentElement.classList.toggle('hem-admin-shell', isAdminShell);
      document.documentElement.classList.toggle('hem-shop-shell', !isAdminShell);
      document.body.classList.toggle('hem-admin-shell', isAdminShell);
      document.body.classList.toggle('hem-shop-shell', !isAdminShell);
    },
    currentStorePath() {
      return this.$route.path.startsWith('/men') ? '/men' : '/women';
    },
    routeRequiresAuth() {
      const matchedRecords = this.$route ? this.$route.matched : [];
      return matchedRecords.some(record => record.meta && (record.meta.requiresAdmin || record.meta.requiresUser));
    },
    routeIsStorefront() {
      const matchedRecords = this.$route ? this.$route.matched : [];
      return matchedRecords.some(record => record.meta && record.meta.storefront);
    },
    shouldBlockInitialRender() {
      return (
        authStore.isAuthenticated() &&
        (this.routeRequiresAuth() || (authStore.isAdmin() && this.routeIsStorefront()))
      );
    },
    async bootstrapAuth() {
      try {
        if (authStore.isAuthenticated()) {
          const currentUser = await authApi.getCurrentUser();

          if (currentUser) {
            authStore.syncUser(currentUser);
          } else {
            authStore.clear();
          }
        }
      } finally {
        this.isAuthInitializing = false;
        this.enforceCurrentRouteAuth();
      }
    },
    enforceCurrentRouteAuth() {
      const matchedRecords = this.$route ? this.$route.matched : [];
      const requiresAdmin = matchedRecords.some(record => record.meta && record.meta.requiresAdmin);
      const requiresUser = matchedRecords.some(record => record.meta && record.meta.requiresUser);

      if (this.routeIsStorefront() && authStore.isAdmin()) {
        this.$router.replace('/studio');
        return;
      }

      if (requiresAdmin && !authStore.isAdmin()) {
        this.$router.replace({
          path: this.currentStorePath(),
          query: {
            auth: 'email',
            redirect: this.$route.fullPath
          }
        });
        return;
      }

      if (requiresUser && !authStore.isAuthenticated()) {
        this.$router.replace({
          path: this.currentStorePath(),
          query: {
            auth: 'email',
            redirect: this.$route.fullPath
          }
        });
      }
    }
  }
};
</script>

<style>
html,
body,
#app {
  min-height: 100%;
}

body {
  margin: 0;
  overflow-x: hidden;
  background: #ffffff;
  color: #111827;
}

#app {
  min-height: 100vh;
}

#app.app--shop,
html.hem-shop-shell,
body.hem-shop-shell {
  background: #ffffff;
}

#app.app--admin,
html.hem-admin-shell,
body.hem-admin-shell {
  background: #ffffff;
}

.app-auth-loading {
  min-height: 100vh;
  display: grid;
  place-items: center;
  align-content: center;
  background: #ffffff;
  color: #64748b;
  font-family: 'Helvetica Neue', Helvetica, Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
</style>
