<template>
  <transition name="profile-confirm">
    <div v-if="confirm" class="profile-confirm-backdrop" @click.self="$emit('close')">
      <section class="profile-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-confirm-title">
        <p class="eyebrow">{{ confirm.eyebrow }}</p>
        <h2 id="profile-confirm-title">{{ confirm.title }}</h2>
        <p>{{ confirm.message }}</p>
        <label v-if="confirm.returnReasons" class="profile-confirm-dialog__field">
          <span>Return reason</span>
          <select
            :value="confirm.returnReason"
            @change="$emit('update-return-reason', $event.target.value)"
          >
            <option
              v-for="option in confirm.returnReasons"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
        <label v-if="confirm.requiresReason" class="profile-confirm-dialog__field">
          <span>Cancellation reason</span>
          <textarea
            :value="confirm.reason"
            rows="4"
            placeholder="Tell us why this order is being canceled."
            @input="$emit('update-reason', $event.target.value.trim())"
          ></textarea>
        </label>
        <label v-if="confirm.requiresNote" class="profile-confirm-dialog__field">
          <span>Note</span>
          <textarea
            :value="confirm.note"
            rows="4"
            placeholder="Add details for the return request."
            @input="$emit('update-note', $event.target.value.trim())"
          ></textarea>
        </label>
        <div class="profile-confirm-dialog__actions">
          <button type="button" class="profile-confirm-dialog__ghost" :disabled="isSaving" @click="$emit('close')">Cancel</button>
          <button type="button" class="profile-confirm-dialog__danger" :disabled="isSaving || isDisabled" @click="$emit('confirm')">
            {{ isSaving ? (confirm.savingLabel || 'Working...') : confirm.confirmLabel }}
          </button>
        </div>
      </section>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'ProfileConfirmDialog',
  props: {
    confirm: {
      type: Object,
      default: null
    },
    isSaving: {
      type: Boolean,
      default: false
    },
    isDisabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'confirm', 'update-reason', 'update-return-reason', 'update-note']
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

.profile-confirm-dialog__field {
  display: grid;
  gap: 8px;
}

.profile-confirm-dialog__field span {
  color: var(--color-text-primary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.profile-confirm-dialog__field textarea,
.profile-confirm-dialog__field select {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(17, 17, 17, 0.16);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.96);
  color: var(--color-text-primary);
  font: inherit;
  line-height: 1.5;
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.profile-confirm-dialog__field textarea {
  min-height: 96px;
  resize: vertical;
}

.profile-confirm-dialog__field select {
  min-height: 44px;
}

.profile-confirm-dialog__field textarea:focus,
.profile-confirm-dialog__field select:focus {
  border-color: rgba(17, 17, 17, 0.48);
  box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.06);
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

@media (max-width: 768px) {
  .profile-confirm-dialog__actions {
    display: grid;
  }
}

@media (min-width: 1440px) {
  .profile-confirm-dialog {
    width: min(100%, 540px);
    gap: 16px;
    padding: 36px;
  }

  .profile-confirm-dialog .eyebrow,
  .profile-confirm-dialog__field span {
    font-size: 0.8125rem;
  }

  .profile-confirm-dialog h2 {
    font-size: 1.5rem;
  }

  .profile-confirm-dialog > p:not(.eyebrow),
  .profile-confirm-dialog__field textarea,
  .profile-confirm-dialog__field select {
    font-size: 1rem;
  }

  .profile-confirm-dialog__ghost,
  .profile-confirm-dialog__danger {
    min-height: 48px;
    padding: 0 22px;
    font-size: 0.9375rem;
  }
}

@media (min-width: 1920px) {
  .profile-confirm-dialog {
    width: min(100%, 620px);
    padding: 42px;
  }

  .profile-confirm-dialog h2 {
    font-size: 1.75rem;
  }

  .profile-confirm-dialog > p:not(.eyebrow),
  .profile-confirm-dialog__field textarea,
  .profile-confirm-dialog__field select {
    font-size: 1.125rem;
  }

  .profile-confirm-dialog__ghost,
  .profile-confirm-dialog__danger {
    min-height: 52px;
    font-size: 1rem;
  }
}
</style>
