<template>
  <transition name="profile-confirm">
    <div v-if="target" class="profile-confirm-backdrop" @click.self="$emit('close')">
      <form class="profile-confirm-dialog profile-order-review" role="dialog" aria-modal="true" @submit.prevent="$emit('submit-review')">
        <p class="eyebrow">Product review</p>
        <h2>{{ target.item.productName }}</h2>
        <div class="profile-order-review__stars" aria-label="Choose rating">
          <button
            v-for="star in 5"
            :key="star"
            type="button"
            :class="{ 'is-active': star <= reviewDraft.rating }"
            @click="$emit('update-review-draft', { rating: star })"
          >
            ★
          </button>
        </div>
        <label>
          <span>Comment</span>
          <textarea
            :value="reviewDraft.comment"
            rows="4"
            placeholder="Share fit, fabric, styling, or delivery notes."
            @input="$emit('update-review-draft', { comment: $event.target.value })"
          ></textarea>
        </label>
        <div class="profile-confirm-dialog__actions">
          <button type="button" class="profile-confirm-dialog__ghost" :disabled="isSaving" @click="$emit('close')">Cancel</button>
          <button type="submit" class="profile-confirm-dialog__danger" :disabled="isSaving">
            {{ isSaving ? 'Saving...' : 'Submit review' }}
          </button>
        </div>
      </form>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'OrderReviewModal',
  props: {
    target: {
      type: Object,
      default: null
    },
    reviewDraft: {
      type: Object,
      default: () => ({
        rating: 5,
        comment: ''
      })
    },
    isSaving: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'submit-review', 'update-review-draft']
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
  font-family: var(--font-family-primary);
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
  border-color: #111111;
  background: transparent;
  color: var(--color-text-primary);
}

.profile-confirm-dialog__ghost:hover:not(:disabled),
.profile-confirm-dialog__danger:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: #111111;
  background: #111111;
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

.profile-order-review {
  gap: 16px;
}

.profile-order-review__stars {
  display: flex;
  gap: 6px;
}

.profile-order-review__stars button {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(17, 17, 17, 0.14);
  border-radius: 8px;
  background: transparent;
  color: var(--color-rating-star-muted);
  cursor: pointer;
}

.profile-order-review__stars button.is-active,
.profile-order-review__stars button:hover {
  border-color: var(--color-rating-star);
  color: var(--color-rating-star);
}

.profile-order-review label {
  display: grid;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.profile-order-review textarea {
  width: 100%;
  min-height: 132px;
  resize: vertical;
  border: 1px solid rgba(17, 17, 17, 0.16);
  border-radius: 8px;
  padding: 14px 16px;
  background: var(--color-surface-base);
  color: var(--color-text-primary);
  font-family: var(--font-family-primary);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.55;
  box-sizing: border-box;
}

.profile-order-review textarea::placeholder {
  color: var(--color-text-secondary);
  opacity: 1;
}

.profile-order-review textarea:focus {
  outline: none;
  border-color: var(--color-border-strong);
  box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.08);
}

@media (max-width: 768px) {
  .profile-confirm-dialog__actions {
    display: grid;
  }
}
</style>
