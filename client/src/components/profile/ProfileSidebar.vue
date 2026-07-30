<template>
  <aside class="profile-sidebar">
    <div class="profile-sidebar__heading">
      <strong>My Account</strong>
    </div>

    <nav class="profile-sidebar__nav" aria-label="Account sections">
      <button
        v-for="section in sections"
        :key="section.key"
        type="button"
        class="profile-sidebar__button"
        :class="{ 'profile-sidebar__button--active': isSectionActive(section.key) }"
        @click="$emit('select-section', section.key)"
      >
        <strong class="profile-sidebar__label">{{ section.label }}</strong>
        <svg class="profile-sidebar__chevron" viewBox="0 0 16 16" fill="none">
          <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </nav>

    <button type="button" class="profile-sidebar__button profile-sidebar__button--logout" @click="$emit('request-logout')">
      <span>Sign out</span>
      <small>Leave this account</small>
    </button>
  </aside>
</template>

<script>
export default {
  name: 'ProfileSidebar',
  props: {
    sections: {
      type: Array,
      default: () => []
    },
    isSectionActive: {
      type: Function,
      default: () => false
    }
  },
  emits: ['select-section', 'request-logout']
};
</script>

<style scoped>
.profile-sidebar {
  --accent: #201c18;
  position: sticky;
  top: calc(var(--store-header-height) + 24px);
  display: grid;
  gap: 16px;
  padding: 20px;
  border-radius: 10px;
  border: 1px solid rgba(17, 17, 17, 0.08);
  background: var(--color-bg-surface-alt);
  box-shadow: 0 4px 16px rgba(17, 17, 17, 0.04);
}

.profile-sidebar__heading {
  display: grid;
  gap: 4px;
  padding: 4px 6px 16px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.profile-sidebar__heading strong {
  color: var(--color-text-primary);
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.profile-sidebar__heading span {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.profile-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.profile-sidebar__button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 56px;
  padding: 10px 14px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-primary);
  text-align: left;
  cursor: pointer;
  transition: background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
  font-family: inherit;
}

.profile-sidebar__label {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}

.profile-sidebar__button:hover {
  color: var(--color-text-primary);
  background: rgba(17, 17, 17, 0.04);
  transform: none;
}

.profile-sidebar__button--active {
  background: rgba(32, 28, 24, 0.05);
  color: var(--color-text-primary);
  box-shadow: inset 3px 0 0 var(--accent);
}
.profile-sidebar__button--active .profile-sidebar__label {
  color: var(--accent);
}
.profile-sidebar__button--active .profile-sidebar__chevron {
  opacity: 1;
  color: var(--accent);
}

.profile-sidebar__chevron {
  width: 14px;
  height: 14px;
  opacity: 0;
  flex-shrink: 0;
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.profile-sidebar__button:hover .profile-sidebar__chevron {
  opacity: 0.5;
  transform: translateX(2px);
}

.profile-sidebar__button--logout {
  min-height: 48px;
  margin-top: 8px;
  padding: 14px 14px 0;
  border-top: 1px solid var(--color-border-subtle);
  border-radius: 0;
  color: var(--color-text-secondary);
  font-size: 14px;
}
.profile-sidebar__button--logout span {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}
.profile-sidebar__button--logout small {
  display: none;
}
.profile-sidebar__button--logout:hover {
  color: #b3261e;
  background: rgba(179, 38, 30, 0.06);
  transform: none;
}

@media (max-width: 1100px) {
  .profile-sidebar {
    position: static;
    padding: 16px;
  }

  .profile-sidebar__nav {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
}

@media (max-width: 560px) {
  .profile-sidebar__nav {
    grid-template-columns: 1fr;
  }
}
</style>
