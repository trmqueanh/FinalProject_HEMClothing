<template>
  <section class="circle-rail" :aria-label="title">
    <h2 v-if="title">{{ title }}</h2>

    <div class="circle-rail__track" role="list">
      <router-link
        v-for="item in items"
        :key="item.key || item.label"
        :to="item.route"
        class="circle-rail__item"
        :class="{ 'circle-rail__item--active': item.active }"
        role="listitem"
        :aria-current="item.active ? 'page' : undefined"
      >
        <span
          class="circle-rail__media"
          :class="[
            `circle-rail__media--${item.tone || 'neutral'}`,
            { 'circle-rail__media--image': item.imageUrl }
          ]"
        >
          <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.label" loading="lazy" />
          <span v-else>{{ item.badgeText || item.label }}</span>
        </span>
        <span class="circle-rail__label">{{ item.label }}</span>
      </router-link>
    </div>
  </section>
</template>

<script>
export default {
  name: 'ShopCircleRail',
  props: {
    title: {
      type: String,
      default: ''
    },
    items: {
      type: Array,
      default: () => []
    }
  }
};
</script>

<style scoped>
.circle-rail {
  display: grid;
  gap: clamp(0.9rem, 1.4vw, 1.2rem);
  min-width: 0;
}

.circle-rail h2 {
  margin: 0;
  color: var(--color-ink);
  font-size: clamp(1.35rem, 1.7vw, 1.9rem);
  line-height: 1.05;
  letter-spacing: 0;
  font-weight: 800;
}

.circle-rail__track {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(104px, 136px);
  gap: clamp(0.75rem, 2.6vw, 2.9rem);
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scroll-snap-type: inline proximity;
  padding: 0.45rem 0 0.35rem;
  scrollbar-width: none;
}

.circle-rail__track::-webkit-scrollbar {
  display: none;
}

.circle-rail__item {
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 0.62rem;
  color: var(--color-ink);
  text-align: center;
  text-decoration: none;
  scroll-snap-align: start;
}

.circle-rail__media {
  --circle-rail-radius: 16px;
  width: 100%;
  aspect-ratio: 4 / 5;
  height: auto;
  border-radius: var(--circle-rail-radius) !important;
  clip-path: inset(0 round var(--circle-rail-radius));
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #3c45b8;
  color: #ffffff;
  box-shadow: 0 10px 24px rgba(17, 24, 39, 0.08);
  transition:
    transform var(--t-fast) var(--ease-out),
    box-shadow var(--t-fast) var(--ease-out);
}

.circle-rail__item:hover .circle-rail__media,
.circle-rail__item--active .circle-rail__media {
  transform: none;
  box-shadow:
    0 16px 32px rgba(17, 24, 39, 0.16),
    inset 0 0 0 2px rgba(255, 255, 255, 0.72);
  filter: brightness(1.04);
}

.circle-rail__item--active .circle-rail__media {
  outline: 3px solid #ffc83d;
  outline-offset: 3px;
}

.circle-rail__media--sale,
.circle-rail__media--red {
  background: #e0001b;
}

.circle-rail__media--gold {
  background: #ffd462;
  color: #161616;
}

.circle-rail__media--mint {
  background: #8cf3a7;
  color: #0a2713;
}

.circle-rail__media--blue {
  background: #3c45b8;
}

.circle-rail__media--neutral {
  background:
    radial-gradient(circle at 32% 20%, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0) 48%),
    #f3f3f3;
  color: var(--color-ink);
}

.circle-rail__media--image {
  aspect-ratio: 4 / 5;
  border-radius: var(--circle-rail-radius) !important;
  clip-path: inset(0 round var(--circle-rail-radius));
  overflow: hidden;
  background: #f5f5f3;
  box-shadow: 0 10px 24px rgba(17, 24, 39, 0.08);
}

.circle-rail__media img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 0 !important;
  clip-path: none;
  display: block;
  transition:
    transform var(--t-fast) var(--ease-out),
    filter var(--t-fast) var(--ease-out);
}

.circle-rail__item:hover .circle-rail__media img {
  transform: scale(1.035);
  filter: saturate(1.04);
}

.circle-rail__media span {
  max-width: 4.4rem;
  padding: 0 0.25rem;
  font-size: clamp(0.72rem, 0.85vw, 0.88rem);
  line-height: 1.05;
  font-weight: 900;
  letter-spacing: 0.01em;
  text-transform: uppercase;
}

.circle-rail__label {
  max-width: 9rem;
  min-height: 2.2em;
  color: var(--color-ink);
  font-size: clamp(0.98rem, 1.08vw, 1.12rem);
  line-height: 1.14;
  font-weight: 760;
  letter-spacing: 0;
}

@media (min-width: 1440px) {
  .circle-rail__track {
    grid-auto-columns: minmax(118px, 150px);
  }

  .circle-rail__label {
    font-size: clamp(1.04rem, 0.9vw, 1.16rem);
  }
}

@media (max-width: 720px) {
  .circle-rail__track {
    grid-auto-columns: minmax(88px, 108px);
    gap: 0.9rem;
  }
}
</style>
