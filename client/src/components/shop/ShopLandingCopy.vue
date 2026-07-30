<template>
  <section class="landing-copy">
    <p class="eyebrow">{{ editorialContent.copyEyebrow }}</p>
    <p>{{ editorialContent.copyBody }}</p>
  </section>
</template>

<script>
export default {
  name: 'ShopLandingCopy',
  props: {
    editorialContent: {
      type: Object,
      required: true
    }
  }
};
</script>

<style scoped>
.landing-copy {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-top: var(--sp-8);
  padding: var(--sp-8) var(--sp-7) var(--sp-9);
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-3);
  align-items: start;
  border-top: 1px solid var(--color-ink-12);
  background: var(--color-paper-warm);
}

.landing-copy .eyebrow {
  margin: 0;
  padding-top: 4px;
  font-size: var(--size-10);
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-ink-30);
}

.landing-copy p {
  margin: 0;
  font-size: var(--size-14);
  line-height: 1.9;
  color: var(--color-ink-60);
  font-weight: 400;
  max-width: 100%;
}

@media (min-width: 1440px) {
  .landing-copy {
    padding-inline: clamp(1rem, 1.2vw, 1.5rem);
  }
}

@media (max-width: 768px) {
  .landing-copy {
    grid-template-columns: 1fr;
    gap: var(--sp-3);
    padding: var(--sp-7) var(--sp-5) var(--sp-8);
  }
}
</style>
