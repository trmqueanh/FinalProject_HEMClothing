<template>
  <transition name="mobile-menu">
  <div v-if="isMenuOpen" class="store-mobile-menu">
      <div class="store-mobile-menu__inner">
        <template v-if="showDepartmentNavigation">
          <router-link
            v-for="link in departmentLinks"
            :key="`mobile-${link.key}`"
            :to="departmentRoute(link.key)"
            class="store-mobile-menu__link"
            :class="{ 'store-mobile-menu__link--active': shouldHighlightDepartment(link.key) }"
            @click="$emit('close-menu')"
          >
            {{ link.label }}
          </router-link>
        </template>

        <router-link to="/profile/orders" class="store-mobile-menu__link" @click="$emit('close-menu')">Order Lookup</router-link>
        <router-link v-if="isAuthenticated" :to="favoritesLink" class="store-mobile-menu__link" @click="$emit('close-menu')">Favorites</router-link>
        <button v-else type="button" class="store-mobile-menu__link" @click="requestGuestAuth">Favorites</button>
        <router-link v-if="isAuthenticated" :to="cartLink" class="store-mobile-menu__link" @click="$emit('close-menu')">Cart</router-link>
        <button v-else type="button" class="store-mobile-menu__link" @click="requestGuestAuth">Cart</button>
        <router-link v-if="isAuthenticated" to="/profile?section=settings" class="store-mobile-menu__link" @click="$emit('close-menu')">Account</router-link>
        <router-link v-if="isAdmin" to="/studio" class="store-mobile-menu__link" @click="$emit('close-menu')">Studio Dashboard</router-link>

        <button v-if="!isAuthenticated" type="button" class="store-mobile-menu__link" @click="$emit('open-auth-modal', 'email')">
          Login / Register
        </button>

        <button v-if="isAuthenticated" type="button" class="store-mobile-menu__link" @click="$emit('request-logout')">Logout</button>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'MobileMenu',
  props: {
    isMenuOpen: {
      type: Boolean,
      default: false
    },
    showDepartmentNavigation: {
      type: Boolean,
      default: true
    },
    departmentLinks: {
      type: Array,
      default: () => []
    },
    favoritesLink: {
      type: [String, Object],
      required: true
    },
    cartLink: {
      type: [String, Object],
      required: true
    },
    isAuthenticated: {
      type: Boolean,
      default: false
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    departmentRoute: {
      type: Function,
      required: true
    },
    shouldHighlightDepartment: {
      type: Function,
      required: true
    }
  },
  emits: ['close-menu', 'open-auth-modal', 'request-logout'],
  methods: {
    requestGuestAuth() {
      this.$emit('close-menu');
      this.$emit('open-auth-modal', 'email');
    }
  }
};
</script>

<style scoped>
.store-mobile-menu {
  border-top: 1px solid var(--color-border-subtle);
  background: #ffffff;
}

.store-mobile-menu__inner {
  width: min(var(--layout-max), calc(100% - var(--layout-gutter) - var(--layout-gutter)));
  margin: 0 auto;
  display: grid;
  gap: 8px;
  padding: 16px 0 20px;
}

.store-mobile-menu__link {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 46px;
  padding: 0 16px;
  border: 1px solid var(--color-border-default);
  border-radius: 18px;
  background: #ffffff;
  text-decoration: none;
  cursor: pointer;
}

.store-mobile-menu__link--active {
  background: #111111;
  color: #ffffff;
  border-color: #111111;
}

.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: opacity 140ms ease, transform 140ms ease;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
}

@media (max-width: 960px) {
  .store-mobile-menu__inner {
    width: min(100%, calc(100% - 24px));
  }
}
</style>
