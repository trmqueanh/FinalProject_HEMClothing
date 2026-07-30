<template>
  <section
    v-if="isAwaitingPayment"
    class="bank-transfer-payment-notice"
    :class="{ 'bank-transfer-payment-notice--compact': compact, 'is-expired': !hasTimeRemaining }"
    aria-live="polite"
  >
    <div class="bank-transfer-payment-notice__copy">
      <strong>{{ title }}</strong>
      <span>{{ message }}</span>
    </div>

    <div class="bank-transfer-payment-notice__action">
      <span v-if="hasTimeRemaining" class="bank-transfer-payment-notice__timer">
        {{ formattedRemainingTime }}
      </span>
      <router-link
        v-if="hasTimeRemaining"
        :to="paymentRoute"
        class="bank-transfer-payment-notice__link"
      >
        Continue payment
      </router-link>
      <span v-else class="bank-transfer-payment-notice__expired">Payment window expired</span>
    </div>
  </section>
</template>

<script>
export default {
  name: 'BankTransferPaymentNotice',
  props: {
    order: {
      type: Object,
      required: true
    },
    compact: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      nowMs: Date.now(),
      timer: null
    };
  },
  computed: {
    paymentStatus() {
      return String(this.order.paymentStatus || '').toLowerCase();
    },
    isAwaitingPayment() {
      return String(this.order.paymentMethod || '').toLowerCase() === 'bank_transfer' &&
        this.paymentStatus === 'pending_payment' &&
        String(this.order.orderStatus || '').toLowerCase() === 'pending';
    },
    expirationMs() {
      return new Date(this.order.paymentExpiresAt || 0).getTime();
    },
    remainingSeconds() {
      if (!Number.isFinite(this.expirationMs)) return 0;
      return Math.max(0, Math.ceil((this.expirationMs - this.nowMs) / 1000));
    },
    hasTimeRemaining() {
      return this.remainingSeconds > 0;
    },
    formattedRemainingTime() {
      const minutes = Math.floor(this.remainingSeconds / 60);
      const seconds = this.remainingSeconds % 60;
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },
    title() {
      return 'You have not completed payment';
    },
    message() {
      if (!this.hasTimeRemaining) {
        return 'This order can no longer be paid with the previous QR code.';
      }

      return 'Please complete the bank transfer before the time runs out.';
    },
    paymentRoute() {
      return `/checkout/payment/${encodeURIComponent(String(this.order.id || ''))}`;
    }
  },
  mounted() {
    this.startTimer();
  },
  beforeUnmount() {
    this.stopTimer();
  },
  methods: {
    startTimer() {
      this.stopTimer();
      this.nowMs = Date.now();
      this.timer = window.setInterval(() => {
        this.nowMs = Date.now();
        if (!this.hasTimeRemaining) this.stopTimer();
      }, 1000);
    },
    stopTimer() {
      if (this.timer) window.clearInterval(this.timer);
      this.timer = null;
    }
  }
};
</script>

<style scoped>
.bank-transfer-payment-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 16px 18px;
  border: 1px solid #f1c46f;
  background: #fff8e8;
  color: #5b3900;
}

.bank-transfer-payment-notice__copy {
  display: grid;
  gap: 4px;
}

.bank-transfer-payment-notice__copy strong {
  color: #9b1c1c;
  font-size: 14px;
}

.bank-transfer-payment-notice__copy span,
.bank-transfer-payment-notice__expired {
  font-size: 12px;
  line-height: 1.45;
}

.bank-transfer-payment-notice__action {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.bank-transfer-payment-notice__timer {
  min-width: 58px;
  color: #111111;
  font-size: 16px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.bank-transfer-payment-notice__link {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 0 15px;
  background: #111111;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
}

.bank-transfer-payment-notice.is-expired {
  border-color: rgba(153, 27, 27, 0.22);
  background: #fff1f1;
}

.bank-transfer-payment-notice--compact {
  margin: 14px 0 0;
  padding: 13px 14px;
}

@media (max-width: 680px) {
  .bank-transfer-payment-notice,
  .bank-transfer-payment-notice__action {
    align-items: stretch;
    flex-direction: column;
  }

  .bank-transfer-payment-notice__link {
    justify-content: center;
  }
}

@media (min-width: 1440px) {
  .bank-transfer-payment-notice,
  .bank-transfer-payment-notice--compact {
    gap: 22px;
    padding: 16px 20px;
  }

  .bank-transfer-payment-notice__copy {
    gap: 5px;
  }

  .bank-transfer-payment-notice__copy strong {
    font-size: 1rem;
  }

  .bank-transfer-payment-notice__copy span,
  .bank-transfer-payment-notice__expired {
    font-size: 0.875rem;
  }

  .bank-transfer-payment-notice__action {
    gap: 14px;
  }

  .bank-transfer-payment-notice__timer {
    min-width: 68px;
    font-size: 1.25rem;
  }

  .bank-transfer-payment-notice__link {
    min-height: 44px;
    padding: 0 18px;
    font-size: 0.875rem;
  }
}

@media (min-width: 1920px) {
  .bank-transfer-payment-notice,
  .bank-transfer-payment-notice--compact {
    padding: 19px 24px;
  }

  .bank-transfer-payment-notice__copy strong {
    font-size: 1.125rem;
  }

  .bank-transfer-payment-notice__copy span,
  .bank-transfer-payment-notice__expired {
    font-size: 0.9375rem;
  }

  .bank-transfer-payment-notice__timer {
    min-width: 78px;
    font-size: 1.5rem;
  }

  .bank-transfer-payment-notice__link {
    min-height: 48px;
    padding: 0 22px;
    font-size: 0.9375rem;
  }
}
</style>
