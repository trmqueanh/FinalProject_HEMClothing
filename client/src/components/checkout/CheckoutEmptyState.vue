<template>
  <section class="shell-card checkout-empty">
    <h2>{{ title }}</h2>
    <p>{{ message }}</p>
    <router-link v-if="showAction" :to="actionTo" class="primary-button">{{ actionLabel }}</router-link>
  </section>
</template>

<script>
export default {
  name: 'CheckoutEmptyState',
  props: {
    title: {
      type: String,
      default: 'Your bag is empty.'
    },
    message: {
      type: String,
      default: 'Add products to your cart before checkout.'
    },
    actionLabel: {
      type: String,
      default: 'Back to shop'
    },
    actionTo: {
      type: [String, Object],
      default: '/women'
    },
    showAction: {
      type: Boolean,
      default: true
    }
  }
};
</script>

<style scoped>
.checkout-empty {
  display: grid;
  gap: 16px;
}

.checkout-empty h2 {
  margin: 0;
  font-size: var(--font-size-xl);
}

.checkout-empty p {
  margin: 0;
  color: var(--color-text-secondary);
}
</style>
