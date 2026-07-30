<template>
  <!-- CheckoutPaymentSection: payment method selection. -->
  <div class="shell-card checkout-form__section">
    <p class="eyebrow">Payment method</p>

    <PaymentMethodSelector
      :model-value="form.paymentMethod"
      @update:model-value="$emit('update-form', { field: 'paymentMethod', value: $event })"
    />
  </div>
</template>

<script>
import PaymentMethodSelector from './PaymentMethodSelector.vue';

export default {
  name: 'CheckoutPaymentSection',
  components: {
    PaymentMethodSelector
  },
  emits: [
    'update-form'
  ],
  props: {
    form: {
      type: Object,
      required: true
    }
  }
};
</script>

<style scoped>
/* CheckoutPaymentSection styles: payment method wrapper và form thẻ nằm cùng component. */
.checkout-form__section {
  display: grid;
  gap: 12px;
}

.checkout-form__section > .eyebrow {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.checkout-form__section label {
  display: grid;
  gap: 6px;
  position: relative;
}

.checkout-form__section label > span {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
}

.checkout-form__section abbr {
  color: #b42318;
  text-decoration: none;
}

.checkout-form__grid-span {
  grid-column: 1 / -1;
}

.checkout-form__section input:not([type='radio']):not([type='checkbox']),
.checkout-form__section select,
.checkout-form__section textarea {
  width: 100%;
  min-height: 46px;
  padding: 0 14px;
  border: 1px solid rgba(17,17,17,0.18);
  border-radius: 8px;
  background: rgba(255,255,255,0.9);
  color: #111111;
  font-family: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
}

.checkout-form__section textarea {
  min-height: 88px;
  padding-top: 12px;
  resize: vertical;
}

.checkout-form__section input:not([type='radio']):not([type='checkbox']):focus,
.checkout-form__section select:focus,
.checkout-form__section textarea:focus {
  border-color: #111111;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(17,17,17,0.08);
}

.checkout-field--valid input,
.checkout-field--valid select {
  border-color: #16803c;
  box-shadow: 0 0 0 3px rgba(22, 128, 60, 0.1);
}

.checkout-field--invalid input,
.checkout-field--invalid select {
  border-color: #b42318;
  box-shadow: 0 0 0 3px rgba(180, 35, 24, 0.1);
}

.checkout-field--valid::after,
.checkout-field--invalid::after {
  position: absolute;
  right: 14px;
  bottom: 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 900;
  pointer-events: none;
}

.checkout-field--valid::after {
  content: '✓';
  background: #16803c;
}

.checkout-field--invalid::after {
  content: '×';
  background: #b42318;
}

.checkout-field-error {
  margin: 0;
  color: #b42318;
  font-size: 12px;
  font-weight: 700;
}

.checkout-card-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 18px;
  border: 1px solid rgba(17,17,17,0.10);
  border-radius: 10px;
  background: transparent;
  animation: checkout-card-in 220ms ease both;
}

.checkout-card-form__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(17,17,17,0.08);
}

.checkout-card-form__top > div {
  display: grid;
  gap: 3px;
}

.checkout-card-form__top strong {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
}

.checkout-card-form__top span,
.checkout-card-form__top b {
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
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
  .checkout-card-form {
    grid-template-columns: 1fr;
  }
}
</style>
