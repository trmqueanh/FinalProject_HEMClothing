<template>
  <div v-if="mode === 'saved'" class="checkout-saved-card checkout-form__grid-span">
    <div class="checkout-saved-card__card">
      <div class="checkout-saved-card__chip"></div>
      <div class="checkout-saved-card__number">•••• •••• •••• {{ cardLast4 }}</div>
      <div class="checkout-saved-card__footer">
        <div class="checkout-saved-card__holder">
          <span>Card holder</span>
          <strong>{{ cardHolderName }}</strong>
        </div>
        <span class="checkout-saved-card__brand">{{ brandShort }}</span>
      </div>
    </div>
    <div class="checkout-saved-card__actions">
      <button type="button" @click="$emit('use-new-card')">Use another card</button>
      <button type="button" @click="$emit('remove')">Remove</button>
    </div>
  </div>

  <button v-else type="button" class="checkout-use-saved-card checkout-form__grid-span" @click="$emit('use-saved-card')">
    Use saved card
  </button>
</template>

<script>
export default {
  name: 'SavedPaymentMethod',
  props: {
    mode: {
      type: String,
      default: 'saved'
    },
    cardLast4: {
      type: String,
      default: ''
    },
    cardHolderName: {
      type: String,
      default: ''
    },
    brandShort: {
      type: String,
      default: 'CARD'
    }
  },
  emits: ['use-new-card', 'use-saved-card', 'remove']
};
</script>

<style scoped>
.checkout-saved-card {
  display: grid;
  gap: 12px;
  animation: checkout-card-in 220ms ease both;
}

.checkout-form__grid-span {
  grid-column: 1 / -1;
}

.checkout-saved-card__card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  max-width: 280px;
  height: 160px;
  padding: 16px 18px;
  border-radius: 12px;
  background: linear-gradient(135deg, #1a1a1a 0%, #3a3a3a 100%);
  color: #fff;
  overflow: hidden;
}

.checkout-saved-card__card::before {
  content: "";
  position: absolute;
  top: -50px;
  right: -50px;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: rgba(255,255,255,0.05);
  pointer-events: none;
}

.checkout-saved-card__chip {
  width: 28px;
  height: 22px;
  border-radius: 4px;
  background: linear-gradient(135deg, #d4a843 0%, #f0c96b 50%, #c49a35 100%);
}

.checkout-saved-card__number {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.14em;
  color: rgba(255,255,255,0.88);
  font-variant-numeric: tabular-nums;
}

.checkout-saved-card__footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.checkout-saved-card__holder {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.checkout-saved-card__holder span {
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.5);
}

.checkout-saved-card__holder strong {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255,255,255,0.88);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.checkout-saved-card__brand {
  font-size: 13px;
  font-weight: 700;
  color: rgba(255,255,255,0.8);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.checkout-saved-card__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.checkout-saved-card__actions button {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 14px;
  border: 1px solid rgba(17,17,17,0.16);
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.14s ease, color 0.14s ease, border-color 0.14s ease;
}

.checkout-saved-card__actions button:hover {
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

.checkout-use-saved-card {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 16px;
  border: 1px solid rgba(17,17,17,0.18);
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.14s ease, color 0.14s ease, border-color 0.14s ease;
}

.checkout-use-saved-card:hover {
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

@keyframes checkout-card-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 960px) {
  .checkout-saved-card {
    grid-template-columns: 1fr;
  }
}
</style>
