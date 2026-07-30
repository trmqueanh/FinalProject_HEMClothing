<template>
  <div v-if="!isDismissed" class="store-sale-strip-shell">
    <router-link :to="saleRoute" class="store-sale-strip" aria-label="Shop mid-season sale">
      <span class="store-sale-strip__copy">MID-SEASON DEALS ARE HOT</span>
      <span class="store-sale-strip__divider" aria-hidden="true">-</span>
      <span class="store-sale-strip__offer">UP TO {{ safeDiscountPercent }}% OFF</span>
      <span class="store-sale-strip__timer" aria-label="Sale countdown">
        <strong>{{ saleCountdown.days }}</strong><span>d</span>
        <i aria-hidden="true">:</i>
        <strong>{{ saleCountdown.hours }}</strong><span></span>
        <i aria-hidden="true">:</i>
        <strong>{{ saleCountdown.minutes }}</strong><span></span>
        <i aria-hidden="true">:</i>
        <strong>{{ saleCountdown.seconds }}</strong><span></span>
      </span>
    </router-link>

    <button type="button" class="store-sale-strip__close" aria-label="Hide sale banner" @click="dismissStrip">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 4l8 8M12 4l-8 8" />
      </svg>
    </button>
  </div>
  <div v-else class="store-sale-strip-spacer" aria-hidden="true"></div>
</template>

<script>
const SEASONAL_SALE_END_AT = Date.parse('2026-08-30T23:59:59+07:00');
const padCountdownPart = value => String(Math.max(0, Number(value) || 0)).padStart(2, '0');

export default {
  name: 'SalePromoStrip',
  props: {
    saleRoute: {
      type: [String, Object],
      default: '/sale'
    },
    discountPercent: {
      type: Number,
      default: 50
    }
  },
  data() {
    return {
      isDismissed: false,
      saleCountdownNow: Date.now(),
      saleCountdownTimer: null
    };
  },
  computed: {
    safeDiscountPercent() {
      const percent = Number(this.discountPercent);
      return Number.isFinite(percent) && percent > 0 ? Math.ceil(percent) : 50;
    },
    saleCountdown() {
      const remaining = Math.max(0, SEASONAL_SALE_END_AT - this.saleCountdownNow);
      const totalSeconds = Math.floor(remaining / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      return {
        days: padCountdownPart(days),
        hours: padCountdownPart(hours),
        minutes: padCountdownPart(minutes),
        seconds: padCountdownPart(seconds)
      };
    }
  },
  mounted() {
    if (!this.isDismissed) {
      this.saleCountdownTimer = window.setInterval(() => {
        this.saleCountdownNow = Date.now();
      }, 1000);
    }
  },
  beforeUnmount() {
    if (this.saleCountdownTimer) {
      window.clearInterval(this.saleCountdownTimer);
    }
  },
  methods: {
    dismissStrip() {
      this.isDismissed = true;

      if (this.saleCountdownTimer) {
        window.clearInterval(this.saleCountdownTimer);
        this.saleCountdownTimer = null;
      }

    }
  }
};
</script>

<style scoped>
.store-sale-strip-shell {
  position: relative;
  z-index: 120;
  width: 100vw;
  margin-top: var(--store-header-height, 98px);
}

.store-sale-strip-spacer {
  width: 100%;
  height: var(--store-header-height, 98px);
}

.store-sale-strip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 34px;
  padding: 0 clamp(48px, 5vw, 76px);
  border-top: 0;
  border-bottom: 1px solid rgba(17, 17, 17, 0.16);
  background: #ffd24a;
  color: #111111;
  text-decoration: none;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  box-shadow: 0 1px 0 rgba(17, 17, 17, 0.06);
}

.store-sale-strip:hover,
.store-sale-strip:focus-visible {
  background: #ffc928;
  color: #111111;
}

.store-sale-strip__copy,
.store-sale-strip__offer {
  white-space: nowrap;
}

.store-sale-strip__divider {
  color: rgba(17, 17, 17, 0.5);
}

.store-sale-strip__timer {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  background: #111111;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0;
}

.store-sale-strip__timer strong {
  min-width: 2ch;
  font-weight: 900;
  text-align: center;
}

.store-sale-strip__timer span,
.store-sale-strip__timer i {
  color: rgba(255, 255, 255, 0.72);
  font-style: normal;
}

.store-sale-strip__close {
  position: absolute;
  left: 12px;
  top: 50%;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #111111;
  cursor: pointer;
  transform: translateY(-50%);
}

.store-sale-strip__close:hover {
  background: rgba(17, 17, 17, 0.08);
}

.store-sale-strip__close svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
}

@media (max-width: 960px) {
  .store-sale-strip {
    gap: 7px;
    min-height: 34px;
    padding: 0 42px;
    font-size: 11px;
  }
}

@media (max-width: 560px) {
  .store-sale-strip {
    flex-wrap: wrap;
    row-gap: 3px;
    min-height: 46px;
    padding: 5px 42px;
    line-height: 1.15;
  }

  .store-sale-strip__divider,
  .store-sale-strip__offer {
    display: none;
  }
}
</style>
