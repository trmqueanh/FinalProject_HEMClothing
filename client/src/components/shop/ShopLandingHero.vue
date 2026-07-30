<template>
  <section
    v-if="activeSlides.length"
    class="lh-shell"
    :aria-label="`${activeDepartmentLabel} landing campaign`"
    @mouseenter="pauseAutoplay"
    @mouseleave="resumeAutoplay"
  >
    <Transition name="lh-slide">
      <router-link
        :key="activeSlide.key"
        :to="activeSlide.route"
        class="lh-hero"
        :aria-label="activeSlide.label"
      >
        <img
          class="lh-media"
          :src="activeSlide.imageUrl"
          :alt="activeSlide.alt"
          loading="eager"
          fetchpriority="high"
        />
      </router-link>
    </Transition>
    <button
      v-if="activeSlides.length > 1"
      type="button"
      class="lh-nav lh-nav--prev"
      aria-label="Previous campaign"
      @click="goToPreviousSlide"
    >
      ‹
    </button>
    <button
      v-if="activeSlides.length > 1"
      type="button"
      class="lh-nav lh-nav--next"
      aria-label="Next campaign"
      @click="goToNextSlide"
    >
      ›
    </button>
    <div v-if="activeSlides.length > 1" class="lh-dots" aria-label="Hero campaigns">
      <button
        v-for="(slide, index) in activeSlides"
        :key="slide.key"
        type="button"
        class="lh-dot"
        :class="{ 'lh-dot--active': index === activeSlideIndex }"
        :aria-label="`Show ${slide.label}`"
        :aria-pressed="index === activeSlideIndex ? 'true' : 'false'"
        @click="goToSlide(index)"
      ></button>
    </div>
  </section>
</template>

<script>
const SALE_HERO_IMAGE = 'https://res.cloudinary.com/dfcgvskfc/image/upload/v1783710754/1bd180bf-a58f-4012-9ea0-a3229a5007d1_wehp6l.png';
const WOMEN_EXTRA_SALE_HERO_IMAGE = 'https://res.cloudinary.com/dfcgvskfc/image/upload/v1783713795/a79401dd-4334-46c3-a8ef-fa0f4c2fc85f_gzmnzl.png';
const MEN_EXTRA_SALE_HERO_IMAGE = 'https://res.cloudinary.com/dfcgvskfc/image/upload/v1783713245/2eace7a4-a913-4335-af35-ef923d485ce8_yekmyu.png';
const AUTOPLAY_DELAY = 5000;
const HERO_SLIDES = {
  women: [
    {
      key: 'women-hot-summer',
      label: 'Shop Women Hot Summer collection',
      alt: 'HEM Women Hot Summer campaign',
      imageUrl: 'https://res.cloudinary.com/dfcgvskfc/image/upload/v1783710177/ChatGPT_Image_02_02_31_11_thg_7_2026_lbhlez.png',
      route: { path: '/collections/summer-2026', query: { department: 'women' } }
    },
    {
      key: 'women-sale',
      label: 'Shop Women sale',
      alt: 'HEM sale campaign',
      imageUrl: SALE_HERO_IMAGE,
      route: { path: '/sale', query: { department: 'women' } }
    },
    {
      key: 'women-sale-extra',
      label: 'Shop Women sale highlights',
      alt: 'HEM Women sale campaign',
      imageUrl: WOMEN_EXTRA_SALE_HERO_IMAGE,
      route: { path: '/sale', query: { department: 'women' } }
    }
  ],
  men: [
    {
      key: 'men-hot-summer',
      label: 'Shop Men Hot Summer collection',
      alt: 'HEM Men Hot Summer campaign',
      imageUrl: 'https://res.cloudinary.com/dfcgvskfc/image/upload/v1783709724/4103ed2c-ea36-49de-91a8-7985ade19e96_irywpg.png',
      route: { path: '/collections/summer-2026', query: { department: 'men' } }
    },
    {
      key: 'men-sale',
      label: 'Shop Men sale',
      alt: 'HEM sale campaign',
      imageUrl: SALE_HERO_IMAGE,
      route: { path: '/sale', query: { department: 'men' } }
    },
    {
      key: 'men-sale-extra',
      label: 'Shop Men sale highlights',
      alt: 'HEM Men sale campaign',
      imageUrl: MEN_EXTRA_SALE_HERO_IMAGE,
      route: { path: '/sale', query: { department: 'men' } }
    }
  ]
};

export default {
  name: 'ShopLandingHero',
  props: {
    activeDepartmentLabel: { type: String, default: '' },
    allProductsLink: { type: [String, Object], required: true }
  },
  data() {
    return {
      activeSlideIndex: 0,
      autoplayTimer: null
    };
  },
  computed: {
    activeDepartmentKey() {
      return String(this.activeDepartmentLabel || '').trim().toLowerCase();
    },
    activeSlides() {
      return HERO_SLIDES[this.activeDepartmentKey] || [];
    },
    activeSlide() {
      return this.activeSlides[this.activeSlideIndex] || this.activeSlides[0] || {};
    }
  },
  watch: {
    activeDepartmentKey() {
      this.activeSlideIndex = 0;
      this.restartAutoplay();
    }
  },
  mounted() {
    this.startAutoplay();
  },
  beforeUnmount() {
    this.stopAutoplay();
  },
  methods: {
    goToPreviousSlide() {
      this.setSlide(this.activeSlideIndex - 1);
    },
    goToNextSlide() {
      this.setSlide(this.activeSlideIndex + 1);
    },
    goToSlide(index) {
      this.setSlide(index);
    },
    setSlide(index) {
      if (!this.activeSlides.length) return;
      const slideCount = this.activeSlides.length;
      this.activeSlideIndex = (index + slideCount) % slideCount;
      this.restartAutoplay();
    },
    startAutoplay() {
      if (this.activeSlides.length <= 1 || this.autoplayTimer) return;
      this.autoplayTimer = window.setInterval(() => {
        const slideCount = this.activeSlides.length;
        this.activeSlideIndex = (this.activeSlideIndex + 1) % slideCount;
      }, AUTOPLAY_DELAY);
    },
    stopAutoplay() {
      if (!this.autoplayTimer) return;
      window.clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    },
    restartAutoplay() {
      this.stopAutoplay();
      this.startAutoplay();
    },
    pauseAutoplay() {
      this.stopAutoplay();
    },
    resumeAutoplay() {
      this.startAutoplay();
    }
  }
};
</script>

<style scoped>
.lh-shell {
  position: relative;
  width: 100vw;
  margin: 0 0 0 calc(50% - 50vw);
  overflow: hidden;
  background: #f4f1eb;
}

.lh-hero {
  display: block;
  width: 100%;
  overflow: hidden;
  border-radius: 0;
  text-decoration: none;
  transform-origin: center;
}

.lh-media {
  display: block;
  width: 100%;
  height: auto;
}

.lh-slide-enter-active,
.lh-slide-leave-active {
  transition:
    opacity 760ms cubic-bezier(0.2, 0.8, 0.2, 1),
    transform 760ms cubic-bezier(0.2, 0.8, 0.2, 1);
  will-change: opacity, transform;
}

.lh-slide-leave-active {
  position: absolute;
  inset: 0;
  width: 100%;
}

.lh-slide-enter-from {
  opacity: 0;
  transform: scale(1.012);
}

.lh-slide-leave-to {
  opacity: 0;
  transform: scale(0.992);
}

.lh-nav {
  position: absolute;
  top: 50%;
  z-index: 2;
  display: grid;
  place-items: center;
  width: clamp(2.55rem, 3.2vw, 3.45rem);
  aspect-ratio: 1;
  border: 0;
  border-radius: 999px;
  background: #fff;
  color: #111;
  font-size: clamp(2.15rem, 2.8vw, 2.85rem);
  font-weight: 400;
  line-height: 1;
  box-shadow: 0 0.45rem 1.2rem rgba(0, 0, 0, 0.16);
  cursor: pointer;
  opacity: 0.96;
  transform: translateY(-50%);
  transition:
    box-shadow 180ms ease,
    opacity 180ms ease,
    transform 180ms ease;
}

.lh-nav:hover {
  box-shadow: 0 0.65rem 1.45rem rgba(0, 0, 0, 0.2);
  opacity: 1;
  transform: translateY(-50%) scale(1.04);
}

.lh-nav:focus-visible {
  outline: 2px solid #111;
  outline-offset: 3px;
}

.lh-nav--prev {
  left: clamp(0.8rem, 2vw, 1.8rem);
  padding-right: 0.12rem;
}

.lh-nav--next {
  right: clamp(0.8rem, 2vw, 1.8rem);
  padding-left: 0.12rem;
}

.lh-dots {
  position: absolute;
  left: 50%;
  bottom: clamp(0.7rem, 1.6vw, 1.2rem);
  z-index: 2;
  display: flex;
  align-items: center;
  gap: clamp(0.8rem, 1.15vw, 1.05rem);
  transform: translateX(-50%);
}

.lh-dot {
  width: clamp(0.5rem, 0.78vw, 0.62rem);
  aspect-ratio: 1;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 0 0.32rem rgba(0, 0, 0, 0.12);
  cursor: pointer;
  transition:
    background 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.lh-dot--active {
  width: clamp(0.78rem, 1.02vw, 0.92rem);
  background: #fff;
  box-shadow: 0 0 0.45rem rgba(0, 0, 0, 0.16);
  transform: scale(1);
}

.lh-dot:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 3px;
}

@media (max-width: 720px) {
  .lh-nav {
    width: 2rem;
    font-size: 1.9rem;
  }

  .lh-dots {
    bottom: 0.45rem;
  }
}
</style>
