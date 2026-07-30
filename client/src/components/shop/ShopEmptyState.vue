<template>
  <div class="shell-card shop-empty">
    <h2>No items found.</h2>
    <p>Try another search or browse a different category.</p>
  </div>
</template>

<script>
export default {
  name: 'ShopEmptyState'
};
</script>

<style scoped>
.shop-empty {
  display: grid;
  gap: var(--sp-2);
  padding: var(--sp-10) var(--sp-7);
  text-align: center;
}

.shop-empty h2 {
  margin: 0;
  font-size: clamp(24px, 4vw, 40px);
  font-weight: 700;
  letter-spacing: -0.01em;
  text-transform: uppercase;
  color: var(--color-ink);
}

.shop-empty p {
  margin: 0;
  font-size: var(--size-14);
  line-height: 1.65;
  color: var(--color-ink-60);
  max-width: 400px;
  margin-inline: auto;
}
</style>
