<template>
  <section class="profile-panel profile-settings">
    <div class="profile-panel__top">
      <div>
        <p class="eyebrow">Settings</p>
        <h1>Account settings</h1>
      </div>
    </div>

    <article class="profile-settings__block">
      <h2>Personal information</h2>
      <div class="profile-settings__readout">
        <p>{{ currentUser.email }}</p>
        <p v-if="form.phone">{{ form.phone }}</p>
        <p v-if="form.fullName || form.name">{{ form.fullName || form.name }}</p>
        <p v-if="form.birthDate">{{ displayDate(form.birthDate) }}</p>
      </div>

      <button type="button" class="profile-settings__edit" @click="$emit('open-editor', 'edit-information')">
        Edit information
      </button>
    </article>

    <article class="profile-settings__block">
      <div class="profile-settings__heading-row">
        <h2>Shipping addresses</h2>
        <button type="button" class="profile-settings__edit" @click="$emit('add-address')">
          Add address
        </button>
      </div>

      <div v-if="addresses.length" class="profile-addresses">
        <article v-for="address in addresses" :key="address.id" class="profile-address-card">
          <div class="profile-address-card__body">
            <div class="profile-address-card__label-row">
              <span class="profile-address-card__name">{{ address.addressLabel || 'Shipping address' }}</span>
              <span v-if="address.isDefault" class="profile-address-card__badge">Default</span>
            </div>
            <p class="profile-address-card__receiver">{{ address.receiverName }} · {{ address.receiverPhone }}</p>
            <p class="profile-address-card__line">{{ formatAddress(address) }}</p>
          </div>
          <div class="profile-address-card__actions">
            <button type="button" @click="$emit('edit-address', address)">Edit</button>
            <button v-if="!address.isDefault" type="button" @click="$emit('set-address-default', address.id)">Set default</button>
            <button type="button" class="is-danger" @click="$emit('delete-address', address)">Delete</button>
          </div>
        </article>
      </div>

      <div v-else class="profile-settings__readout">
        <p>No saved shipping address yet.</p>
      </div>
    </article>

    <article class="profile-settings__block profile-settings__block--password">
      <h2>Password</h2>
      <button type="button" class="profile-settings__edit" @click="$emit('open-editor', 'change-password')">
        Change password
      </button>
    </article>
  </section>
</template>

<script>
export default {
  name: 'ProfileSettings',
  props: {
    currentUser: {
      type: Object,
      default: () => ({ email: '' })
    },
    form: {
      type: Object,
      required: true
    },
    addresses: {
      type: Array,
      default: () => []
    },
    displayDate: {
      type: Function,
      required: true
    },
    formatAddress: {
      type: Function,
      required: true
    }
  },
  emits: [
    'open-editor',
    'add-address',
    'edit-address',
    'set-address-default',
    'delete-address'
  ]
};
</script>

<style scoped>
.profile-panel {
  display: grid;
  gap: 32px;
}

.profile-panel__top {
  display: grid;
  gap: 8px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(17, 17, 17, 0.10);
}

.profile-panel__top h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0;
  text-transform: none;
}

.profile-panel__top .eyebrow {
  display: none;
}

.profile-settings__block {
  padding: 0;
  border: none;
  background: transparent;
}

.profile-settings__block p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.55;
}

.profile-settings {
  gap: 0;
}

.profile-settings__block {
  display: grid;
  gap: 16px;
  padding: 28px 0;
  border-width: 0 0 1px;
  background: transparent;
}

.profile-settings__block h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.profile-settings__heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.profile-settings__readout {
  display: grid;
  gap: 6px;
  font-size: 14px;
  font-weight: 400;
}

.profile-settings__readout p {
  color: var(--color-text-secondary);
  margin: 0;
}

.profile-settings__edit {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 16px;
  border: 1px solid var(--color-border-default);
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  letter-spacing: 0;
  text-decoration: none;
  text-transform: none;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.profile-settings__edit:hover {
  background: var(--color-text-primary);
  border-color: var(--color-text-primary);
  color: var(--color-bg, #fff);
}

.profile-addresses {
  display: grid;
  gap: 14px;
}

.profile-addresses {
  display: grid;
  gap: 10px;
}

.profile-address-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 148px;
  gap: 0;
  align-items: stretch;
  padding: 0;
  border: 1px solid rgba(17,17,17,0.10);
  border-radius: 10px;
  background: transparent;
  overflow: hidden;
  transition: border-color 0.15s ease;
}

.profile-address-card:hover {
  border-color: rgba(17,17,17,0.22);
}

.profile-address-card__body {
  display: grid;
  gap: 4px;
  padding: 16px 18px;
  align-content: start;
}

.profile-address-card__label-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.profile-address-card__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.profile-address-card__receiver {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.profile-address-card__line {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.profile-address-card__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  background: #111111;
  color: #ffffff;
  font-size: 9px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.profile-address-card__actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 148px;
  border-left: 1px solid rgba(17, 17, 17, 0.09);
}

.profile-address-card__actions button {
  flex: none;
  height: 40px;
  padding: 0 18px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;
  white-space: nowrap;
  width: 100%;
}

.profile-address-card__actions button + button {
  border-top: 1px solid rgba(17, 17, 17, 0.07);
}

.profile-address-card__actions button:hover {
  background: #111111;
  color: #ffffff;
}

.profile-address-card__actions button.is-danger {
  color: #b91c1c;
}

.profile-address-card__actions button.is-danger:hover {
  background: #b91c1c;
  color: #ffffff;
}

@media (max-width: 768px) {
  .profile-panel__top h1 {
    font-size: 18px;
  }

  .profile-address-card {
    grid-template-columns: 1fr;
  }

  .profile-address-card__actions {
    flex-direction: row;
    min-width: 0;
    border-left: none;
    border-top: 1px solid rgba(17, 17, 17, 0.09);
  }

  .profile-address-card__actions button + button {
    border-top: none;
    border-left: 1px solid rgba(17, 17, 17, 0.07);
  }

  .profile-address-card__actions button {
    flex: 1 1 0;
    width: auto;
    min-width: 0;
    padding: 12px 0;
  }
}
</style>
