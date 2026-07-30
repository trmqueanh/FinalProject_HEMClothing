<template>
  <article
    class="coupon-card"
    :class="{ 'coupon-card--expired': isExpired, 'coupon-card--profile': profileMode }"
    :aria-disabled="profileMode && isExpired ? 'true' : undefined"
  >
    <div class="coupon-card__badge">
      {{ discountLabel }}
    </div>

    <div class="coupon-card__body">
      <div class="coupon-card__top">
        <span v-if="!profileMode" class="coupon-card__code-label">Code:</span>
        <strong class="coupon-card__code">{{ coupon.code }}</strong>
        <span
          v-if="showStatus"
          class="coupon-card__status"
          :class="`is-${coupon.status}`"
        >
          {{ formatLabel(coupon.status) }}
        </span>
      </div>

      <ul class="coupon-card__meta">
        <li class="coupon-card__meta-minimum">
          <span class="coupon-card__meta-label">Min. order</span>
          <span class="coupon-card__meta-value">
            {{ profileMode ? formatCurrency(coupon.minOrderAmount) : minimumOrderLabel }}
          </span>
        </li>
        <li v-if="profileMode">
          <span class="coupon-card__meta-label">Max. discount</span>
          <span class="coupon-card__meta-value">{{ maximumDiscountLabel }}</span>
        </li>
        <template v-if="profileMode">
          <li class="coupon-card__meta-divider" aria-hidden="true"></li>
          <li class="coupon-card__validity">
            <span class="coupon-card__meta-value">{{ validityLabel }}</span>
          </li>
        </template>
        <template v-else-if="showUsageDetails">
          <li class="coupon-card__meta-divider" aria-hidden="true"></li>
          <li>
            <span class="coupon-card__meta-label">Expires</span>
            <span class="coupon-card__meta-value">{{ formattedEndDate }}</span>
          </li>
          <li>
            <span class="coupon-card__meta-label">Remaining uses</span>
            <span class="coupon-card__meta-value">
              {{ coupon.remainingUses === null ? 'Unlimited' : coupon.remainingUses }}
            </span>
          </li>
        </template>
      </ul>

      <button v-if="!profileMode" type="button" class="coupon-card__copy" @click="copyCode">
        <svg v-if="copied" width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <path d="M2 6.5L5.2 10 11 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <svg v-else width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <rect x="4.5" y="1.5" width="7" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3" />
          <path d="M1.5 4.5h1.5M1.5 4.5a1.5 1.5 0 0 0-1.5 1.5v5A1.5 1.5 0 0 0 1.5 12.5h5A1.5 1.5 0 0 0 8 11v-1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
        </svg>
        {{ copied ? 'Copied!' : 'Copy' }}
      </button>
    </div>
  </article>
</template>

<script>
import { formatVietnamDate } from '../../helpers/dateTime';

export default {
  name: 'CouponCard',
  props: {
    coupon: {
      type: Object,
      required: true
    },
    formatCurrency: {
      type: Function,
      default: value => String(value || '')
    },
    formatLabel: {
      type: Function,
      default: value => String(value || '')
    },
    profileMode: {
      type: Boolean,
      default: false
    },
    showStatus: {
      type: Boolean,
      default: true
    },
    showUsageDetails: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      copied: false,
      copyResetTimer: null
    };
  },
  computed: {
    isExpired() {
      return this.coupon.status === 'expired';
    },
    discountLabel() {
      const value = this.coupon.discountType === 'percent'
        ? `${this.coupon.discountValue}%`
        : this.formatCurrency(this.coupon.discountValue);

      return this.profileMode ? value : `SAVE\n${value}`;
    },
    minimumOrderLabel() {
      return `Orders from ${this.formatCurrency(this.coupon.minOrderAmount)}`;
    },
    formattedEndDate() {
      return formatVietnamDate(this.coupon.endDate, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }, 'No expiration');
    },
    validityLabel() {
      if (this.isExpired) return 'Expired';
      return this.coupon.endDate ? `Valid until ${this.formattedEndDate}` : 'No expiration';
    },
    maximumDiscountLabel() {
      if (this.coupon.discountType === 'fixed') {
        return this.formatCurrency(this.coupon.discountValue);
      }

      return this.coupon.maxDiscountAmount === null
        ? 'No maximum'
        : this.formatCurrency(this.coupon.maxDiscountAmount);
    }
  },
  beforeUnmount() {
    window.clearTimeout(this.copyResetTimer);
  },
  methods: {
    async copyCode() {
      const code = String(this.coupon.code || '');

      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(code);
      } else {
        const input = document.createElement('textarea');
        input.value = code;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
      }

      this.copied = true;
      window.clearTimeout(this.copyResetTimer);
      this.copyResetTimer = window.setTimeout(() => {
        this.copied = false;
      }, 1400);
    }
  }
};
</script>

<style scoped>
.coupon-card {
  display: flex;
  align-items: stretch;
  min-width: 0;
  min-height: 132px;
  border: 1.5px dashed rgba(17, 17, 17, 0.24);
  border-radius: 8px;
  background: #f1f2f3;
  overflow: hidden;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.coupon-card:hover {
  border-color: rgba(17, 17, 17, 0.46);
  box-shadow: 0 5px 18px rgba(17, 17, 17, 0.08);
}

.coupon-card--expired {
  filter: grayscale(1);
  opacity: 0.55;
  box-shadow: none;
}

.coupon-card--expired:hover {
  border-color: rgba(17, 17, 17, 0.24);
  box-shadow: none;
}

.coupon-card__badge {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 82px;
  padding: 16px 8px;
  background: #111111;
  color: #ffffff;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: 0;
  text-align: center;
  overflow-wrap: anywhere;
}

.coupon-card:not(.coupon-card--profile) .coupon-card__badge {
  white-space: pre-line;
}

.coupon-card__badge::after {
  content: '';
  position: absolute;
  right: -9px;
  top: 50%;
  width: 18px;
  height: 18px;
  border: 1.5px dashed rgba(17, 17, 17, 0.24);
  border-radius: 50%;
  background: #f1f2f3;
  transform: translateY(-50%);
  z-index: 1;
}

.coupon-card__body {
  flex: 1;
  display: grid;
  align-content: center;
  gap: 10px;
  min-width: 0;
  padding: 16px 14px 16px 22px;
}

.coupon-card__top {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.coupon-card__code {
  color: #111111;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

.coupon-card__code-label {
  color: #111111;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}

.coupon-card__status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 10px;
  border-radius: 999px;
  background: #dedfe1;
  color: #333333;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0;
  text-transform: uppercase;
}

.coupon-card__status.is-expired,
.coupon-card__status.is-fully_used,
.coupon-card__status.is-not_started {
  color: #7c2d12;
  background: #fee2c8;
}

.coupon-card__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px 22px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.coupon-card__meta li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.coupon-card__meta-divider {
  grid-column: 1 / -1;
  height: 1px;
  background: rgba(17, 17, 17, 0.11);
  margin: 2px 0;
}

.coupon-card__validity {
  grid-column: 1 / -1;
}

.coupon-card__meta-label {
  color: #686868;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: uppercase;
}

.coupon-card__meta-value {
  color: #111111;
  font-size: 12px;
  font-weight: 700;
  overflow-wrap: anywhere;
  white-space: nowrap;
}

.coupon-card__copy {
  align-self: start;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 32px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: #111111;
  color: #ffffff;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease, transform 150ms ease;
}

.coupon-card__copy:hover {
  background: #2f2f2f;
  color: #ffffff;
  transform: translateY(-1px);
}

.coupon-card__copy:focus-visible {
  outline: 2px solid #111111;
  outline-offset: 2px;
}

.coupon-card:not(.coupon-card--profile) .coupon-card__body {
  justify-items: center;
  text-align: center;
  padding: 16px 18px 16px 24px;
}

.coupon-card:not(.coupon-card--profile) .coupon-card__top {
  justify-content: center;
  gap: 6px;
}

.coupon-card:not(.coupon-card--profile) .coupon-card__code {
  font-size: 18px;
  line-height: 1;
}

.coupon-card:not(.coupon-card--profile) .coupon-card__meta {
  display: block;
}

.coupon-card:not(.coupon-card--profile) .coupon-card__meta li {
  align-items: center;
}

.coupon-card:not(.coupon-card--profile) .coupon-card__meta-label {
  display: none;
}

.coupon-card:not(.coupon-card--profile) .coupon-card__meta-value {
  font-size: 13px;
  font-weight: 500;
}

@media (max-width: 560px) {
  .coupon-card {
    min-height: 122px;
  }

  .coupon-card__badge {
    width: 68px;
    font-size: 13px;
  }

  .coupon-card__body {
    padding: 13px 10px 13px 19px;
  }

  .coupon-card__meta {
    gap: 6px 12px;
  }

  .coupon-card__copy {
    min-height: 30px;
    padding: 0 16px;
  }
}
</style>
