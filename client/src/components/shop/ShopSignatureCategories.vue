<template>
  <section class="landing-section" aria-labelledby="section-signature">
    <h2 id="section-signature">Signature Categories</h2>

    <div class="signature-grid" role="list">
      <router-link
        v-for="(signature, index) in signatureCategories"
        :key="signature.label"
        :to="signatureRoute(signature)"
        class="signature-card"
        role="listitem"
        :aria-label="`${signature.label} — Explore`"
      >
        <div class="signature-card__visual" :class="`signature-card__visual--${(index % 4) + 1}`" aria-hidden="true">
          <img v-if="signature.image" :src="signature.image" alt="" loading="lazy" />
        </div>
        <div class="signature-card__copy">
          <h3>{{ signature.label }}</h3>
          <span aria-hidden="true">Explore</span>
        </div>
      </router-link>
    </div>
  </section>
</template>

<script>
export default {
  name: 'ShopSignatureCategories',
  props: {
    signatureCategories: {
      type: Array,
      default: () => []
    },
    signatureRoute: {
      type: Function,
      required: true
    }
  }
};
</script>

<style scoped>
.landing-section {
  display: grid;
  gap: clamp(0.9rem, 1.4vw, 1.2rem);
  padding: clamp(1.6rem, 2.4vw, 2.6rem) clamp(0.85rem, 2.5vw, 3.5rem) 0;
}

.landing-section h2 {
  margin: 0;
  color: var(--color-ink);
  font-size: clamp(1.35rem, 1.7vw, 1.9rem);
  line-height: 1.05;
  letter-spacing: 0;
  font-weight: 800;
}

.signature-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-4);
  margin-top: var(--sp-4);
}

.signature-grid {
  grid-template-columns: repeat(2, minmax(0, 520px));
  justify-content: center;
  gap: 42px 36px;
}

.signature-card {
  width: 100%;
  max-width: none;
  margin: 0;
  text-decoration: none !important;
}

.signature-card__visual {
  width: 100%;
  aspect-ratio: 3 / 3.6;
  border-radius: 0;
  overflow: hidden;
  position: relative;
  background-color: #e8ddd4;
  transition: transform var(--t-slow) var(--ease-out);
}

.signature-card__visual img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.signature-card:hover .signature-card__visual {
  transform: scale(1.03);
}

.signature-card__visual--1 {
  background:
    radial-gradient(ellipse at 70% 20%, rgba(255,255,255,0.60) 0%, transparent 60%),
    linear-gradient(155deg, #f0e8de 0%, #d4c4b0 50%, #9a8878 100%);
}
.signature-card__visual--2 {
  background:
    radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.50) 0%, transparent 55%),
    linear-gradient(155deg, #e8ddd4 0%, #c8b8a4 50%, #887868 100%);
}
.signature-card__visual--3 {
  background:
    radial-gradient(ellipse at 65% 25%, rgba(255,255,255,0.55) 0%, transparent 60%),
    linear-gradient(155deg, #f4ede6 0%, #dcceba 50%, #a09080 100%);
}
.signature-card__visual--4 {
  background:
    radial-gradient(ellipse at 35% 20%, rgba(255,255,255,0.45) 0%, transparent 55%),
    linear-gradient(155deg, #ece4da 0%, #c4b4a0 50%, #7a6a5a 100%);
}

.signature-card__visual::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0.0) 70%, rgba(0,0,0,0.18) 100%);
  pointer-events: none;
}

.signature-card__copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--sp-1);
  padding: var(--sp-3) var(--sp-1) var(--sp-1);
}

.signature-card h3 {
  margin: 0;
  font-size: var(--size-11);
  letter-spacing: 0.10em;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-ink);
  transition: color var(--t-fast);
}

.signature-card:hover h3 {
  color: var(--color-ink-60);
}

.signature-card span {
  color: var(--color-ink-30);
  font-size: var(--size-10);
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
  transition: color var(--t-fast);
}

.signature-card:hover span {
  color: var(--color-ink-60);
}

@media (max-width: 860px) {
  .signature-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 720px) {
  .landing-section { padding-inline: 1rem; }
}
@media (max-width: 480px) {
  .signature-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sp-1); }
}
</style>
