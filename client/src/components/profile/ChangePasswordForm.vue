<template>
  <form class="change-password-card" novalidate @submit.prevent="submitForm">
    <button v-if="showBackButton" type="button" class="change-password-back" :aria-label="backAriaLabel" @click="$emit('cancel')">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      <span>{{ backLabel }}</span>
    </button>

    <div class="change-password-card__top">
      <p class="eyebrow">{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </div>

    <p v-if="localSuccess" class="change-password-message change-password-message--success">
      {{ localSuccess }}
    </p>
    <p v-if="formError" class="change-password-message change-password-message--error">
      {{ formError }}
    </p>

    <div class="change-password-fields">
      <label v-if="requiresCurrentPassword" class="change-password-field" :class="fieldClass('currentPassword')">
        <span>Current password <abbr title="required">*</abbr></span>
        <span class="change-password-field__control">
          <input
            v-model="form.currentPassword"
            :type="visible.currentPassword ? 'text' : 'password'"
            autocomplete="current-password"
            required
            :aria-invalid="Boolean(fieldError('currentPassword'))"
            @blur="touchField('currentPassword')"
            @input="handleInput('currentPassword')"
          />
          <span v-if="fieldStatus('currentPassword')" class="change-password-field__status" :class="`change-password-field__status--${fieldStatus('currentPassword')}`">
            {{ fieldStatus('currentPassword') === 'valid' ? '✓' : '×' }}
          </span>
          <button
            type="button"
            class="change-password-field__toggle"
            :aria-label="visible.currentPassword ? 'Hide current password' : 'Show current password'"
            @click="toggleVisibility('currentPassword')"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </span>
        <small v-if="fieldError('currentPassword')" class="change-password-error">
          {{ fieldError('currentPassword') }}
        </small>
      </label>

      <label class="change-password-field" :class="fieldClass('newPassword')">
        <span>New password <abbr title="required">*</abbr></span>
        <span class="change-password-field__control">
          <input
            v-model="form.newPassword"
            :type="visible.newPassword ? 'text' : 'password'"
            autocomplete="new-password"
            minlength="8"
            maxlength="25"
            required
            :aria-invalid="Boolean(fieldError('newPassword'))"
            @blur="touchField('newPassword')"
            @input="handleInput('newPassword')"
          />
          <span v-if="fieldStatus('newPassword')" class="change-password-field__status" :class="`change-password-field__status--${fieldStatus('newPassword')}`">
            {{ fieldStatus('newPassword') === 'valid' ? '✓' : '×' }}
          </span>
          <button
            type="button"
            class="change-password-field__toggle"
            :aria-label="visible.newPassword ? 'Hide new password' : 'Show new password'"
            @click="toggleVisibility('newPassword')"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </span>
        <small v-if="fieldError('newPassword')" class="change-password-error">
          {{ fieldError('newPassword') }}
        </small>
      </label>

      <div class="change-password-strength" :class="`change-password-strength--${strengthTone}`">
        <span>
          <b>Password strength</b>
          {{ strengthLabel }}
        </span>
        <div aria-hidden="true">
          <i v-for="step in 4" :key="step" :class="{ 'is-active': step <= strengthScore }"></i>
        </div>
      </div>

      <ul class="change-password-rules" aria-label="Password requirements">
        <li :class="{ 'is-valid': requirements.length, 'is-invalid': hasNewPasswordFeedback && !requirements.length }">
          <span>{{ requirements.length ? '✓' : '×' }}</span>
          Use 8 to 25 characters.
        </li>
        <li :class="{ 'is-valid': requirements.complexity, 'is-invalid': hasNewPasswordFeedback && !requirements.complexity }">
          <span>{{ requirements.complexity ? '✓' : '×' }}</span>
          Include 1 number, 1 uppercase letter, and 1 lowercase letter.
        </li>
        <li :class="{ 'is-valid': requirements.noSpaces, 'is-invalid': hasNewPasswordFeedback && !requirements.noSpaces }">
          <span>{{ requirements.noSpaces ? '✓' : '×' }}</span>
          Do not use spaces.
        </li>
      </ul>

      <label class="change-password-field" :class="fieldClass('confirmPassword')">
        <span>Confirm new password <abbr title="required">*</abbr></span>
        <span class="change-password-field__control">
          <input
            v-model="form.confirmPassword"
            :type="visible.confirmPassword ? 'text' : 'password'"
            autocomplete="new-password"
            minlength="8"
            maxlength="25"
            required
            :aria-invalid="Boolean(fieldError('confirmPassword'))"
            @blur="touchField('confirmPassword')"
            @input="handleInput('confirmPassword')"
          />
          <span v-if="fieldStatus('confirmPassword')" class="change-password-field__status" :class="`change-password-field__status--${fieldStatus('confirmPassword')}`">
            {{ fieldStatus('confirmPassword') === 'valid' ? '✓' : '×' }}
          </span>
          <button
            type="button"
            class="change-password-field__toggle"
            :aria-label="visible.confirmPassword ? 'Hide confirm password' : 'Show confirm password'"
            @click="toggleVisibility('confirmPassword')"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </span>
        <small v-if="fieldError('confirmPassword')" class="change-password-error">
          {{ fieldError('confirmPassword') }}
        </small>
      </label>
    </div>

    <div class="change-password-actions">
      <button type="submit" class="change-password-submit" :disabled="!canSubmit">
        {{ isSubmitting ? submittingLabel : submitLabel }}
      </button>
      <button v-if="showCancelButton" type="button" class="change-password-cancel" @click="$emit('cancel')">
        {{ cancelLabel }}
      </button>
    </div>
  </form>
</template>

<script>
import { changePasswordMethods } from './logic/changePasswordMethods';
import {
  PASSWORD_FIELDS,
  PASSWORD_PATTERN,
  createDefaultPasswordForm
} from './logic/changePasswordConfig';

export default {
  name: 'ChangePasswordForm',
  props: {
    isSubmitting: {
      type: Boolean,
      default: false
    },
    serverError: {
      type: Object,
      default: null
    },
    successMessage: {
      type: String,
      default: ''
    },
    formError: {
      type: String,
      default: ''
    },
    eyebrow: {
      type: String,
      default: 'Security'
    },
    title: {
      type: String,
      default: 'Change password'
    },
    description: {
      type: String,
      default: 'Keep your HEM account secure with a strong member password.'
    },
    requiresCurrentPassword: {
      type: Boolean,
      default: true
    },
    showBackButton: {
      type: Boolean,
      default: true
    },
    showCancelButton: {
      type: Boolean,
      default: true
    },
    backLabel: {
      type: String,
      default: 'Back'
    },
    backAriaLabel: {
      type: String,
      default: 'Back to account settings'
    },
    cancelLabel: {
      type: String,
      default: 'Cancel'
    },
    submitLabel: {
      type: String,
      default: 'Update password'
    },
    submittingLabel: {
      type: String,
      default: 'Updating password...'
    }
  },
  emits: ['submit', 'cancel', 'clear-server-error'],
  data() {
    return {
      form: createDefaultPasswordForm(),
      touched: {},
      submitAttempted: false,
      localSuccess: '',
      serverErrors: {},
      visible: {
        currentPassword: false,
        newPassword: false,
        confirmPassword: false
      },
      visibilityTimers: {}
    };
  },
  computed: {
    requirements() {
      const password = String(this.form.newPassword || '');

      return {
        length: password.length >= 8 && password.length <= 25,
        complexity: /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password),
        noSpaces: password.length > 0 && !/\s/.test(password)
      };
    },
    isNewPasswordStrong() {
      return PASSWORD_PATTERN.test(this.form.newPassword);
    },
    isConfirmMatching() {
      return Boolean(this.form.confirmPassword) && this.form.confirmPassword === this.form.newPassword;
    },
    activePasswordFields() {
      return this.requiresCurrentPassword
        ? PASSWORD_FIELDS
        : PASSWORD_FIELDS.filter(field => field !== 'currentPassword');
    },
    hasNewPasswordFeedback() {
      return Boolean(this.form.newPassword) || this.touched.newPassword || this.submitAttempted;
    },
    strengthScore() {
      return Object.values(this.requirements).filter(Boolean).length + (this.form.newPassword.length >= 12 ? 1 : 0);
    },
    strengthLabel() {
      if (!this.form.newPassword) return 'Not started';
      if (this.strengthScore <= 1) return 'Weak';
      if (this.strengthScore <= 3) return 'Good';
      return 'Strong';
    },
    strengthTone() {
      if (!this.form.newPassword) return 'idle';
      if (this.strengthScore <= 1) return 'weak';
      if (this.strengthScore <= 3) return 'good';
      return 'strong';
    },
    canSubmit() {
      const hasRequiredCurrentPassword = !this.requiresCurrentPassword || Boolean(this.form.currentPassword);
      const isDifferentFromCurrent = !this.requiresCurrentPassword || this.form.currentPassword !== this.form.newPassword;

      return (
        !this.isSubmitting &&
        hasRequiredCurrentPassword &&
        this.isNewPasswordStrong &&
        this.isConfirmMatching &&
        isDifferentFromCurrent
      );
    }
  },
  watch: {
    serverError: {
      immediate: true,
      deep: true,
      handler(error) {
        if (!error || !error.field) {
          this.serverErrors = {};
          return;
        }

        this.localSuccess = '';
        this.serverErrors = {
          [error.field]: error.message || 'Please check this field and try again.'
        };
        this.touched = {
          ...this.touched,
          [error.field]: true
        };
      }
    },
    successMessage(value) {
      if (!value) return;
      this.localSuccess = value;
      this.resetForm();
    }
  },
  beforeUnmount() {
    Object.values(this.visibilityTimers).forEach(timer => window.clearTimeout(timer));
  },
  methods: changePasswordMethods
};
</script>

<style scoped>
.change-password-card {
  display: grid;
  gap: 26px;
  width: min(760px, 100%);
  padding: clamp(24px, 5vw, 52px);
  border: 1px solid rgba(17, 17, 17, 0.1);
  border-radius: 0;
  background:
    linear-gradient(145deg, rgba(245, 239, 231, 0.78), rgba(245, 239, 231, 0.78)),
    var(--color-surface-base);
  box-shadow: 0 24px 70px rgba(17, 17, 17, 0.08);
}

.change-password-back {
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

.change-password-back svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.change-password-back:hover {
  transform: translateY(-1px);
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

.change-password-card__top {
  display: grid;
  gap: 8px;
}

.change-password-card__top h1,
.change-password-card__top p {
  margin: 0;
}

.change-password-card__top h1 {
  color: #111111;
  font-size: clamp(36px, 7vw, 72px);
  font-weight: 950;
  letter-spacing: -0.08em;
  line-height: 0.92;
  text-transform: uppercase;
}

.change-password-card__top > p:not(.eyebrow) {
  max-width: 520px;
  color: var(--color-text-secondary);
  font-size: 15px;
  line-height: 1.55;
}

.change-password-fields {
  display: grid;
  gap: 16px;
}

.change-password-field {
  display: grid;
  gap: 8px;
}

.change-password-field > span:first-child {
  color: rgba(17, 17, 17, 0.68);
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.change-password-field abbr {
  color: #b42318;
  text-decoration: none;
}

.change-password-field__control {
  position: relative;
  display: block;
}

.change-password-field input {
  width: 100%;
  height: 58px;
  padding: 0 92px 0 16px;
  border: 1px solid rgba(17, 17, 17, 0.15);
  border-radius: 0;
  background: rgba(255, 255, 255, 0.86);
  color: #111111;
  font-size: 16px;
  outline: none;
  transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
}

.change-password-field input:hover {
  border-color: rgba(17, 17, 17, 0.35);
}

.change-password-field input:focus {
  border-color: #111111;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(17, 17, 17, 0.08);
}

.change-password-field--valid input {
  border-color: #16803c;
  box-shadow: 0 0 0 4px rgba(22, 128, 60, 0.09);
}

.change-password-field--invalid input {
  border-color: #b42318;
  box-shadow: 0 0 0 4px rgba(180, 35, 24, 0.09);
}

.change-password-field__status,
.change-password-field__toggle {
  position: absolute;
  top: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-50%);
}

.change-password-field__status {
  right: 54px;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 950;
}

.change-password-field__status--valid {
  background: #16803c;
}

.change-password-field__status--invalid {
  background: #b42318;
}

.change-password-field__toggle {
  right: 8px;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(17, 17, 17, 0.64);
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease;
}

.change-password-field__toggle:hover {
  background: rgba(17, 17, 17, 0.08);
  color: #111111;
}

.change-password-field__toggle svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
}

.change-password-error {
  color: #b42318;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.45;
}

.change-password-message {
  margin: 0;
  padding: 13px 16px;
  font-size: 13px;
  font-weight: 800;
}

.change-password-message--success {
  border: 1px solid rgba(22, 128, 60, 0.2);
  background: rgba(22, 128, 60, 0.08);
  color: #0f5f2e;
}

.change-password-message--error {
  border: 1px solid rgba(180, 35, 24, 0.2);
  background: rgba(180, 35, 24, 0.08);
  color: #8f1d16;
}

.change-password-strength {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid rgba(17, 17, 17, 0.09);
  background: rgba(255, 255, 255, 0.58);
}

.change-password-strength span {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.change-password-strength div {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.change-password-strength i {
  height: 4px;
  background: rgba(17, 17, 17, 0.12);
  transition: background 180ms ease, transform 180ms ease;
}

.change-password-strength i.is-active {
  transform: scaleY(1.4);
}

.change-password-strength--weak i.is-active {
  background: #b42318;
}

.change-password-strength--good i.is-active {
  background: #9a6a16;
}

.change-password-strength--strong i.is-active {
  background: #16803c;
}

.change-password-rules {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.change-password-rules li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.45;
  transition: color 160ms ease;
}

.change-password-rules span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: rgba(17, 17, 17, 0.1);
  color: #ffffff;
  font-size: 11px;
  font-weight: 950;
  flex: 0 0 auto;
}

.change-password-rules li.is-valid {
  color: #16803c;
}

.change-password-rules li.is-valid span {
  background: #16803c;
}

.change-password-rules li.is-invalid {
  color: #b42318;
}

.change-password-rules li.is-invalid span {
  background: #b42318;
}

.change-password-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.change-password-submit,
.change-password-cancel {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 26px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease, color 180ms ease;
}

.change-password-submit {
  border: 1px solid #111111;
  background: transparent;
  color: #111111;
}

.change-password-submit:not(:disabled):hover {
  transform: translateY(-1px);
  background: #111111;
  color: #ffffff;
  box-shadow: 0 16px 36px rgba(17, 17, 17, 0.18);
}

.change-password-submit:disabled {
  border-color: rgba(17, 17, 17, 0.12);
  background: rgba(17, 17, 17, 0.16);
  color: rgba(17, 17, 17, 0.45);
  cursor: not-allowed;
}

.change-password-cancel {
  border: 1px solid rgba(17, 17, 17, 0.18);
  background: transparent;
  color: #111111;
}

.change-password-cancel:hover {
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

@media (max-width: 640px) {
  .change-password-card {
    padding: 22px;
  }

  .change-password-actions {
    display: grid;
  }

  .change-password-submit,
  .change-password-cancel {
    width: 100%;
  }
}
</style>
