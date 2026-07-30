<template>
  <div class="checkout-payment">
    <label class="checkout-payment__option" :class="{ 'is-active': modelValue === 'cod' }">
      <input :checked="modelValue === 'cod'" type="radio" value="cod" @change="$emit('update:modelValue', 'cod')" />
      <span class="checkout-payment__radio"></span>
      <span class="checkout-payment__icon">
        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 8.5h9.2c.8 0 1.5.7 1.5 1.5v4.2H3V8.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
          <path d="M13.7 10.2h2.1l1.7 2.1v1.9h-3.8v-4Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
          <circle cx="6" cy="15" r="1.2" stroke="currentColor" stroke-width="1.4"/>
          <circle cx="15.5" cy="15" r="1.2" stroke="currentColor" stroke-width="1.4"/>
          <path d="M4.8 6h5.8M5.9 4.2h3.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
      </span>
      <span class="checkout-payment__label">Cash on Delivery</span>
    </label>

    <label class="checkout-payment__option" :class="{ 'is-active': modelValue === 'bank_transfer' }">
      <input :checked="modelValue === 'bank_transfer'" type="radio" value="bank_transfer" @change="$emit('update:modelValue', 'bank_transfer')" />
      <span class="checkout-payment__radio"></span>
      <span class="checkout-payment__icon">
        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="5" height="5" stroke="currentColor" stroke-width="1.4"/>
          <rect x="12" y="3" width="5" height="5" stroke="currentColor" stroke-width="1.4"/>
          <rect x="3" y="12" width="5" height="5" stroke="currentColor" stroke-width="1.4"/>
          <path d="M12 12h2v2h-2v-2Zm4 0h1v5h-5v-1h4v-4Z" fill="currentColor"/>
        </svg>
      </span>
      <span class="checkout-payment__label">Bank Transfer (QR Code)</span>
    </label>
  </div>
</template>

<script>
export default {
  name: 'PaymentMethodSelector',
  props: {
    modelValue: {
      type: String,
      default: 'cod'
    }
  },
  emits: ['update:modelValue']
};
</script>

<style scoped>
.checkout-payment {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.checkout-payment__option {
  display: flex !important;
  align-items: center;
  gap: 10px;
  min-height: 56px;
  padding: 0 16px;
  border: 1.5px solid rgba(17,17,17,0.14);
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.checkout-payment__option input[type="radio"] {
  display: none;
}

.checkout-payment__option:hover {
  border-color: rgba(17,17,17,0.32);
  background: rgba(17,17,17,0.02);
}

.checkout-payment__option.is-active {
  border-color: #111111;
  background: transparent;
}

.checkout-payment__radio {
  width: 16px;
  height: 16px;
  aspect-ratio: 1;
  border-radius: 50% !important;
  clip-path: circle(50% at 50% 50%);
  border: 1.5px solid rgba(17,17,17,0.3);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.checkout-payment__option.is-active .checkout-payment__radio {
  border-color: #111111;
  background: #111111 !important;
}

.checkout-payment__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.checkout-payment__option.is-active .checkout-payment__icon {
  color: var(--color-text-primary);
}

.checkout-payment__icon svg {
  width: 18px;
  height: 18px;
}

.checkout-payment__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  letter-spacing: 0;
  text-transform: none;
}

@media (max-width: 960px) {
  .checkout-payment {
    grid-template-columns: 1fr;
  }
}
</style>
