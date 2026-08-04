<template>
  <transition :name="transitionName">
    <div v-if="open" :class="backdropClass" @click.self="requestClose">
      <section :class="dialogClass" role="dialog" aria-modal="true" :aria-labelledby="titleId">
        <h2 :id="titleId">{{ title }}</h2>
        <p>{{ message }}</p>
        <div :class="actionsClass">
          <button type="button" :class="ghostClass" :disabled="isSaving" @click="requestClose">{{ cancelLabel }}</button>
          <button
            type="button"
            :class="[dangerClass, { 'is-danger': dangerTone }]"
            :disabled="isSaving"
            @click="$emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </section>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'PaymentRemoveDialog',
  props: {
    open: {
      type: Boolean,
      default: false
    },
    isSaving: {
      type: Boolean,
      default: false
    },
    variant: {
      type: String,
      default: 'profile'
    },
    eyebrowText: {
      type: String,
      default: ''
    },
    titleText: {
      type: String,
      default: ''
    },
    messageText: {
      type: String,
      default: ''
    },
    confirmText: {
      type: String,
      default: ''
    },
    cancelText: {
      type: String,
      default: ''
    },
    dangerTone: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'confirm'],
  computed: {
    isProfileVariant() {
      return this.variant !== 'checkout';
    },
    transitionName() {
      return this.isProfileVariant ? 'profile-confirm' : 'checkout-confirm';
    },
    backdropClass() {
      return this.isProfileVariant ? 'profile-confirm-backdrop' : 'checkout-confirm-backdrop';
    },
    dialogClass() {
      return this.isProfileVariant ? 'profile-confirm-dialog' : 'checkout-confirm-dialog';
    },
    actionsClass() {
      return this.isProfileVariant ? 'profile-confirm-dialog__actions' : 'checkout-confirm-dialog__actions';
    },
    ghostClass() {
      return this.isProfileVariant ? 'profile-confirm-dialog__ghost' : 'checkout-confirm-dialog__ghost';
    },
    dangerClass() {
      return this.isProfileVariant ? 'profile-confirm-dialog__danger' : 'checkout-confirm-dialog__danger';
    },
    titleId() {
      return this.isProfileVariant ? 'profile-remove-payment-title' : 'checkout-remove-payment-title';
    },
    eyebrow() {
      if (this.eyebrowText) return this.eyebrowText;
      return this.isProfileVariant ? 'Payment methods' : 'Saved card';
    },
    title() {
      if (this.titleText) return this.titleText;
      return 'Remove saved card?';
    },
    message() {
      if (this.messageText) return this.messageText;
      return this.isProfileVariant
        ? 'This card will be removed from your account. You can save a card again during checkout.'
        : 'This card will be removed from your saved payment methods. You can save a card again during checkout.';
    },
    cancelLabel() {
      return this.cancelText || 'Cancel';
    },
    confirmLabel() {
      if (this.confirmText) return this.confirmText;
      return this.isSaving ? 'Removing...' : 'Remove card';
    }
  },
  methods: {
    requestClose() {
      if (this.isSaving) return;
      this.$emit('close');
    }
  }
};
</script>

<style scoped>
.profile-confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 12000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(17, 17, 17, 0.36);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  pointer-events: auto;
}

.profile-confirm-dialog {
  width: min(100%, 400px);
  display: grid;
  gap: 12px;
  padding: 26px;
  border: 0.5px solid rgba(17,17,17,0.14);
  border-radius: 14px;
  background: rgba(255,255,255,0.98);
  box-shadow: 0 24px 70px rgba(17,17,17,0.18);
}

.profile-confirm-dialog h2,
.profile-confirm-dialog p {
  margin: 0;
}

.profile-confirm-dialog h2 {
  color: var(--color-text-primary);
  font-size: 17px;
  font-weight: 600;
}

.profile-confirm-dialog > p:not(.eyebrow) {
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.profile-confirm-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.profile-confirm-dialog__ghost,
.profile-confirm-dialog__danger {
  min-height: 42px;
  padding: 0 18px;
  border: 1px solid rgba(17, 17, 17, 0.16);
  border-radius: 999px;
  font-family: inherit;
  font-weight: 800;
  cursor: pointer;
  transition: transform 160ms ease, background 160ms ease, color 160ms ease, border-color 160ms ease;
}

.profile-confirm-dialog__ghost {
  background: transparent;
  color: var(--color-text-primary);
}

.profile-confirm-dialog__danger {
  border-color: rgba(185, 28, 28, 0.3);
  background: transparent;
  color: #b91c1c;
}

.profile-confirm-dialog__ghost:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

.profile-confirm-dialog__danger:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: #b91c1c;
  background: #b91c1c;
  color: #ffffff;
}

.profile-confirm-dialog__ghost:disabled,
.profile-confirm-dialog__danger:disabled {
  cursor: wait;
  opacity: 0.62;
}

.profile-confirm-enter-active,
.profile-confirm-leave-active {
  transition: opacity 180ms ease;
}

.profile-confirm-enter-from,
.profile-confirm-leave-to {
  opacity: 0;
}

.checkout-confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 12000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(17, 17, 17, 0.36);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  pointer-events: auto;
}

.checkout-confirm-dialog {
  width: min(100%, 400px);
  display: grid;
  gap: 12px;
  padding: 26px;
  border: 0.5px solid rgba(17,17,17,0.14);
  border-radius: 14px;
  background: rgba(255,255,255,0.98);
  box-shadow: 0 24px 70px rgba(17,17,17,0.18);
}

.checkout-confirm-dialog h2,
.checkout-confirm-dialog p {
  margin: 0;
}

.checkout-confirm-dialog h2 {
  font-size: 17px;
  font-weight: 600;
}

.checkout-confirm-dialog > p:not(.eyebrow) {
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.checkout-confirm-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.checkout-confirm-dialog__ghost,
.checkout-confirm-dialog__danger {
  min-height: 42px;
  padding: 0 18px;
  border: 1px solid rgba(17, 17, 17, 0.16);
  border-radius: 999px;
  font-family: inherit;
  font-weight: 800;
  cursor: pointer;
  transition: transform 160ms ease, background 160ms ease, color 160ms ease, border-color 160ms ease;
}

.checkout-confirm-dialog__ghost {
  background: transparent;
  color: var(--color-text-primary);
}

.checkout-confirm-dialog__danger {
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

.checkout-confirm-dialog__danger.is-danger {
  border-color: #b42318;
  background: #b42318;
}

.checkout-confirm-dialog__ghost:hover:not(:disabled),
.checkout-confirm-dialog__danger:hover:not(:disabled) {
  transform: translateY(-1px);
}

.checkout-confirm-dialog__ghost:disabled,
.checkout-confirm-dialog__danger:disabled {
  cursor: not-allowed;
  opacity: 0.5;
  transform: none;
}

.checkout-confirm-enter-active,
.checkout-confirm-leave-active {
  transition: opacity 180ms ease;
}

.checkout-confirm-enter-from,
.checkout-confirm-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .profile-confirm-dialog__actions {
    display: grid;
  }
}

@media (max-width: 960px) {
  .checkout-confirm-dialog__actions {
    display: grid;
  }
}

@media (min-width: 1440px) {
  .profile-confirm-dialog,
  .checkout-confirm-dialog { width: min(100%, 540px); gap: 16px; padding: 36px; }
  .profile-confirm-dialog .eyebrow,
  .checkout-confirm-dialog .eyebrow { font-size: 13px; }
  .profile-confirm-dialog h2,
  .checkout-confirm-dialog h2 { font-size: 24px; }
  .profile-confirm-dialog > p:not(.eyebrow),
  .checkout-confirm-dialog > p:not(.eyebrow) { font-size: 16px; }
  .profile-confirm-dialog__ghost,
  .profile-confirm-dialog__danger,
  .checkout-confirm-dialog__ghost,
  .checkout-confirm-dialog__danger { min-height: 48px; padding: 0 22px; font-size: 15px; }
}

@media (min-width: 1920px) {
  .profile-confirm-dialog,
  .checkout-confirm-dialog { width: min(100%, 620px); padding: 42px; }
  .profile-confirm-dialog h2,
  .checkout-confirm-dialog h2 { font-size: 28px; }
  .profile-confirm-dialog > p:not(.eyebrow),
  .checkout-confirm-dialog > p:not(.eyebrow) { font-size: 18px; }
  .profile-confirm-dialog__ghost,
  .profile-confirm-dialog__danger,
  .checkout-confirm-dialog__ghost,
  .checkout-confirm-dialog__danger { min-height: 52px; font-size: 16px; }
}
</style>
