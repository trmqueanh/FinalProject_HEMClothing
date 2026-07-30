<template>
  <div v-if="hasSavedCard" class="profile-payment-card">
    <div class="profile-payment-card__chip"></div>
    <div class="profile-payment-card__number">{{ savedCardLabel }}</div>
    <div class="profile-payment-card__footer">
      <div class="profile-payment-card__holder">
        <span>Card holder</span>
        <strong>{{ cardHolderName }}</strong>
      </div>
      <div class="profile-payment-card__brand">{{ savedCardBrandShort }}</div>
    </div>
  
  </div>

  <div v-else class="profile-payment-empty">
    <h3>You have no saved payment methods yet.</h3>
    <p>You can securely save a card during checkout for faster future purchases.</p>
  </div>

  <button v-if="hasSavedCard" type="button" class="profile-payment-card__remove" :disabled="isSaving" @click="$emit('remove-card')">
      {{ isSaving ? 'Removing...' : 'Remove card' }}
    </button>
</template>

<script>
export default {
  name: 'PaymentMethodCard',
  props: {
    hasSavedCard: {
      type: Boolean,
      default: false
    },
    savedCardLabel: {
      type: String,
      default: ''
    },
    cardHolderName: {
      type: String,
      default: ''
    },
    savedCardBrandShort: {
      type: String,
      default: ''
    },
    isSaving: {
      type: Boolean,
      default: false
    }
  },
  emits: ['remove-card']
};
</script>

<style scoped>
.profile-payment-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  max-width: 340px;
  height: 190px;
  padding: 20px 22px;
  border-radius: 14px;
  background: linear-gradient(135deg, #1a1a1a 0%, #3a3a3a 100%);
  color: #fff;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.profile-payment-card::before {
  content: "";
  position: absolute;
  top: -60px;
  right: -60px;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: rgba(255,255,255,0.05);
  pointer-events: none;
}

.profile-payment-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 40px rgba(17,17,17,0.22);
}

.profile-payment-card__chip {
  width: 34px;
  height: 26px;
  border-radius: 5px;
  background: linear-gradient(135deg, #d4a843 0%, #f0c96b 50%, #c49a35 100%);
  position: relative;
}
.profile-payment-card__chip::after {
  content: "";
  position: absolute;
  inset: 4px;
  border-radius: 3px;
  border: 1px solid rgba(0,0,0,0.2);
}

.profile-payment-card__number {
  font-size: 17px;
  font-weight: 500;
  letter-spacing: 0.18em;
  color: rgba(255,255,255,0.9);
  font-variant-numeric: tabular-nums;
}

.profile-payment-card__footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.profile-payment-card__holder {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.profile-payment-card__holder span {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.5);
}

.profile-payment-card__holder strong {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,0.9);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.profile-payment-card__brand {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgba(255,255,255,0.85);
  text-transform: uppercase;
}

.profile-payment-card__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: fit-content;
  flex: 0 0 auto;

  height: 34px;
  padding: 0 16px;
  margin-top: 12px;

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

  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.profile-payment-card__remove:hover:not(:disabled) {
  background: #b42318;
  border-color: #b42318;
  color: #fff;
}

.profile-payment-card__remove:disabled {
  cursor: wait;
  opacity: 0.56;
}

.profile-payment-empty {
  display: grid;
  gap: 6px;
  max-width: 340px;
  padding: 22px;
  border: 1px dashed rgba(17,17,17,0.16);
  border-radius: 10px;
  background: transparent;
}

.profile-payment-empty h3 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 600;
}

.profile-payment-empty p {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

@media (max-width: 768px) {
  .profile-payment-card {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .profile-payment-card__remove {
    justify-self: start;
  }
}
</style>
