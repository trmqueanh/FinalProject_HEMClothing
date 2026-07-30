<template>
  <transition name="auth-modal">
    <div v-if="open" class="auth-modal-backdrop" @click.self="$emit('close')">
      <section
        class="shell-card auth-modal logout-confirm"
        :class="{ 'logout-confirm--studio': logoutConfirmContext === 'admin' }"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
      >
        <div class="auth-modal__topbar">
          <div>
            <p class="eyebrow">{{ logoutConfirmCopy.eyebrow }}</p>
            <h2 id="logout-confirm-title">{{ logoutConfirmCopy.title }}</h2>
          </div>

          <button type="button" class="auth-modal__close" @click="$emit('close')">Close</button>
        </div>

        <p>{{ logoutConfirmCopy.message }}</p>

        <div class="logout-confirm__actions">
          <button type="button" class="ghost-button" @click="$emit('close')">{{ logoutConfirmCopy.cancel }}</button>
          <button type="button" class="primary-button" @click="$emit('confirm')">{{ logoutConfirmCopy.confirm }}</button>
        </div>
      </section>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'LogoutConfirmDialog',
  props: {
    open: {
      type: Boolean,
      default: false
    },
    logoutConfirmContext: {
      type: String,
      default: 'shop'
    },
    logoutConfirmCopy: {
      type: Object,
      required: true
    }
  },
  emits: ['close', 'confirm']
};
</script>

<style scoped>
/* LogoutConfirmDialog: khung xác nhận logout tự giữ CSS modal để không phụ thuộc ShopLayout.css. */
.auth-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 12000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(21, 21, 21, 0.28);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  pointer-events: auto;
  overflow: hidden;
}

.auth-modal {
  width: min(100%, 520px);
  display: grid;
  gap: var(--space-3);
  background: #ffffff;
  box-shadow: 0 32px 90px rgba(17, 17, 17, 0.22);
  backdrop-filter: none;
}

.logout-confirm h2,
.logout-confirm > p {
  margin: 0;
}

.auth-modal__topbar {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  align-items: flex-start;
}

.auth-modal__close {
  min-height: 38px;
  padding: 0 16px;
  border: 1px solid rgba(17,17,17,0.14);
  border-radius: 8px;
  background: transparent;
  color: rgba(17,17,17,0.65);
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.auth-modal__close:hover {
  background: rgba(17,17,17,0.06);
  color: #111111;
}

.auth-modal-enter-active,
.auth-modal-leave-active {
  transition: opacity 140ms ease, transform 140ms ease;
}

.auth-modal-enter-from,
.auth-modal-leave-to {
  opacity: 0;
}

.logout-confirm__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 4px;
}

.logout-confirm__actions .ghost-button,
.logout-confirm__actions .primary-button {
  flex: 1 1 0;
  min-height: 44px;
  padding: 0 20px;
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.logout-confirm__actions .ghost-button {
  justify-content: center;
}

@media (max-width: 768px) {
  .auth-modal-backdrop {
    padding: 12px;
  }
}

@media (max-width: 620px) {
  .auth-modal__topbar {
    flex-direction: column;
  }
}

@media (min-width: 1440px) {
  .auth-modal { width: min(100%, 540px); gap: 16px; padding: 36px; }
  .auth-modal .eyebrow { font-size: 13px; }
  .auth-modal h2 { font-size: 24px; }
  .auth-modal > p { font-size: 16px; line-height: 1.65; }
  .auth-modal__close,
  .logout-confirm__actions .ghost-button,
  .logout-confirm__actions .primary-button { min-height: 48px; font-size: 15px; }
}

@media (min-width: 1920px) {
  .auth-modal { width: min(100%, 620px); padding: 42px; }
  .auth-modal h2 { font-size: 28px; }
  .auth-modal > p { font-size: 18px; }
  .auth-modal__close,
  .logout-confirm__actions .ghost-button,
  .logout-confirm__actions .primary-button { min-height: 52px; font-size: 16px; }
}
</style>
