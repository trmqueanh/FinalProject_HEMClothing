<template>
  <transition-group name="flash-stack" tag="div" class="flash-stack">
    <article
      v-for="item in items"
      :key="item.id"
      class="flash-item"
      :class="`flash-item--${item.type}`"
      role="status"
      aria-live="polite"
    >
      <p>{{ item.message }}</p>
      <button type="button" class="flash-item__close" aria-label="Dismiss message" @click="dismiss(item.id)">
        Close
      </button>
    </article>
  </transition-group>
</template>

<script>
import { flashState, removeFlash } from '../../helpers/flash';

export default {
  name: 'FlashMessages',
  computed: {
    items() {
      return flashState.items;
    }
  },
  methods: {
    dismiss(id) {
      removeFlash(id);
    }
  }
};
</script>

<style scoped>
.flash-stack {
  display: grid;
  gap: var(--space-2);
}

.flash-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: rgba(255, 250, 244, 0.98);
  box-shadow: 0 18px 32px rgba(35, 26, 19, 0.12);
}

.flash-item--success {
  border-color: rgba(24, 116, 72, 0.32);
}

.flash-item--error {
  border-color: rgba(180, 35, 24, 0.32);
}

.flash-item p {
  margin: 0;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

.flash-item__close {
  min-height: 32px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-strong);
}

.flash-item__close:hover {
  color: var(--color-text-primary);
}

.flash-stack-enter-active,
.flash-stack-leave-active {
  transition:
    transform var(--motion-fast),
    opacity var(--motion-fast);
}

.flash-stack-enter-from,
.flash-stack-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
