<template>
  <form class="profile-panel profile-form profile-form-page" @submit.prevent="submitForm">
    <div class="profile-panel__top">
      <button type="button" class="profile-form__back" aria-label="Back to account settings" @click="$emit('cancel')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        <span>Back</span>
      </button>
      <div>
        <p class="eyebrow">Settings</p>
        <h1>Edit information</h1>
      </div>
    </div>

    <div class="profile-form__grid">
      <label>
        <span>Account name <abbr title="required">*</abbr></span>
        <input :value="form.name" type="text" required @input="updateField('name', $event.target.value.trim())" />
      </label>
      <label>
        <span>Email <abbr title="required">*</abbr></span>
        <input :value="currentUser.email" type="email" disabled />
      </label>
      <label>
        <span>Full name <abbr title="required">*</abbr></span>
        <input :value="form.fullName" type="text" required @input="updateField('fullName', $event.target.value.trim())" />
      </label>
      <label :class="{ 'profile-field--invalid': phoneTouched && phoneError }">
        <span>Phone <abbr title="required">*</abbr></span>
        <input
          :value="form.phone"
          type="tel"
          inputmode="tel"
          autocomplete="tel"
          maxlength="20"
          placeholder="0912345678 or +84912345678"
          required
          @blur="phoneTouched = true"
          @input="updatePhone"
        />
        <small v-if="phoneTouched && phoneError" class="profile-field-error">{{ phoneError }}</small>
      </label>
      <label>
        <span>Gender</span>
        <select :value="form.gender" @change="updateField('gender', $event.target.value)">
          <option value="">Prefer not to say</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label>
        <span>Birth date</span>
        <input
          :value="form.birthDate"
          type="date"
          :max="maxBirthDate"
          @input="updateField('birthDate', $event.target.value)"
        />
      </label>
    </div>

    <div class="profile-form__actions">
      <button type="submit" class="profile-form__submit" :disabled="isSaving">
        {{ isSaving ? 'Saving...' : 'Save information' }}
      </button>
      <button type="button" class="profile-form__ghost" @click="$emit('cancel')">Cancel</button>
    </div>
  </form>
</template>

<script>
import { getVietnamDateParts } from '../../helpers/dateTime';
import { isValidVietnamPhone } from '../../utils/vietnamLocations';

export default {
  name: 'ProfileInformationForm',
  props: {
    currentUser: {
      type: Object,
      default: () => ({ email: '' })
    },
    form: {
      type: Object,
      required: true
    },
    isSaving: {
      type: Boolean,
      default: false
    }
  },
  emits: ['save', 'cancel', 'update-form'],
  data() {
    return {
      phoneTouched: false
    };
  },
  computed: {
    maxBirthDate() {
      const parts = getVietnamDateParts();
      const pad = value => String(value).padStart(2, '0');
      return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
    },
    phoneError() {
      return isValidVietnamPhone(this.form.phone)
        ? ''
        : 'Enter a valid Vietnamese mobile number, for example 0912345678.';
    }
  },
  methods: {
    updateField(field, value) {
      this.$emit('update-form', { field, value });
    },
    updatePhone(event) {
      this.phoneTouched = true;
      this.updateField('phone', event && event.target ? event.target.value.trim() : '');
    },
    submitForm() {
      this.phoneTouched = true;
      if (this.phoneError) return;
      this.$emit('save');
    }
  }
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

.profile-form {
  display: grid;
  gap: 24px;
  width: 100%;
  max-width: 680px;
}

.profile-form__back {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid rgba(17, 17, 17, 0.16);
  border-radius: 999px;
  background: transparent;
  color: #111111;
  font-family: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 160ms ease, background 160ms ease, color 160ms ease, border-color 160ms ease;
}

.profile-form__back svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.profile-form__back:hover {
  transform: translateY(-1px);
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

.profile-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.profile-form label {
  position: relative;
  display: grid;
  gap: 8px;
}

.profile-form label span {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
}

.profile-form abbr {
  color: #b42318;
  text-decoration: none;
}

.profile-form input,
.profile-form select {
  width: 100%;
  height: 46px;
  padding: 0 14px;
  border: 1px solid rgba(17,17,17,0.18);
  border-radius: 8px;
  background: rgba(255,255,255,0.9);
  color: #111111;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.profile-form input:focus,
.profile-form select:focus {
  border-color: #111111;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(17,17,17,0.08);
}

.profile-form input:disabled {
  background: rgba(255, 255, 255, 0.45);
  color: var(--color-text-secondary);
}

.profile-field--invalid input {
  border-color: #b42318;
  box-shadow: 0 0 0 3px rgba(180, 35, 24, 0.1);
}

.profile-field-error {
  color: #b42318;
  font-size: 12px;
  line-height: 1.4;
}

.profile-form__submit,
.profile-form__ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: min(300px, 100%);
  min-height: 46px;
  padding: 0 24px;
  border: 1px solid rgba(17, 17, 17, 0.18);
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-decoration: none;
  text-transform: none;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  font-family: inherit;
}

.profile-form__submit:hover:not(:disabled),
.profile-form__ghost:hover {
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

.profile-form__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.profile-form__ghost {
  background: transparent;
  color: var(--color-text-primary);
}

@media (max-width: 768px) {
  .profile-panel__top h1 {
    font-size: 18px;
  }

  .profile-form__grid {
    grid-template-columns: 1fr;
  }
}
</style>
