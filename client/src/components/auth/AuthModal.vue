<template>
  <transition name="auth-modal">
    <div v-if="open" class="auth-modal-backdrop" @click.self="$emit('close')">
      <section
        class="shell-card auth-modal auth-modal--member"
        :class="{ 'auth-modal--register': mode === 'register' }"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <div class="auth-modal__topbar">
          <div class="auth-modal__intro">
            <p class="eyebrow">HEM member</p>
            <h2 id="auth-modal-title">{{ modalTitle }}</h2>
            <p>{{ modalCopy }}</p>
          </div>

          <button type="button" class="auth-modal__close" aria-label="Close login dialog" @click="$emit('close')">
            Close
          </button>
        </div>

        <form v-if="mode === 'email'" class="auth-form auth-form--member" novalidate :aria-busy="isSubmitting ? 'true' : 'false'" @submit.prevent="submitEmailForm">
          <label>
            <span class="auth-label">Email <strong>*</strong></span>
            <span class="auth-input-field">
              <input
                v-model.trim="emailValue"
                type="email"
                inputmode="email"
                autocomplete="email"
                placeholder="you@example.com"
                :aria-invalid="Boolean(errors.email)"
                @input="clearError('email')"
              />
              <span
                v-if="emailState(emailForm.email, 'email')"
                class="auth-validation-icon"
                :class="`auth-validation-icon--${emailState(emailForm.email, 'email')}`"
                aria-hidden="true"
              ></span>
            </span>
            <small v-if="errors.email" class="auth-field-error">{{ errors.email }}</small>
          </label>

          <button type="submit" class="primary-button auth-form__submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Checking email...' : 'Continue' }}
          </button>
        </form>

        <form v-else-if="mode === 'login'" class="auth-form auth-form--member" novalidate :aria-busy="isSubmitting ? 'true' : 'false'" @submit.prevent="submitLoginForm">
          <div class="auth-account-preview">
            <span>Signing in as</span>
            <strong>{{ loginForm.email }}</strong>
          </div>

          <label>
            <span class="auth-label">Password <strong>*</strong></span>
            <span class="auth-input-field auth-password-field">
              <input
                v-model="loginPasswordValue"
                :type="showLoginPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Enter your password"
                :aria-invalid="Boolean(errors.loginPassword)"
                @input="clearError('loginPassword')"
              />
              <button type="button" class="auth-field-action auth-field-action--password" :aria-label="showLoginPassword ? 'Hide password' : 'Show password'" @click="togglePasswordVisibility('login')">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </span>
            <small v-if="errors.loginPassword" class="auth-field-error">{{ errors.loginPassword }}</small>
          </label>

          <button type="button" class="auth-form__text-action" @click="goForgot">
            Forgot password?
          </button>

          <button type="submit" class="primary-button auth-form__submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Signing in...' : 'Login' }}
          </button>

          <button type="button" class="ghost-button auth-form__submit" @click="goEmail">
            Use another email
          </button>
        </form>

        <form v-else-if="mode === 'forgot'" class="auth-form auth-form--member" novalidate :aria-busy="isSubmitting ? 'true' : 'false'" @submit.prevent="submitForgotForm">
          <label>
            <span class="auth-label">Email <strong>*</strong></span>
            <span class="auth-input-field">
              <input
                v-model.trim="forgotEmailValue"
                type="email"
                autocomplete="email"
                :aria-invalid="Boolean(errors.forgotEmail)"
                @input="clearError('forgotEmail')"
              />
              <span
                v-if="emailState(forgotForm.email, 'forgotEmail')"
                class="auth-validation-icon"
                :class="`auth-validation-icon--${emailState(forgotForm.email, 'forgotEmail')}`"
                aria-hidden="true"
              ></span>
            </span>
            <small v-if="errors.forgotEmail" class="auth-field-error">{{ errors.forgotEmail }}</small>
          </label>

          <button type="submit" class="primary-button auth-form__submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Preparing reset email...' : 'Send reset link' }}
          </button>

          <button type="button" class="ghost-button auth-form__submit" @click="$emit('set-mode', 'login')">
            Back to login
          </button>
        </form>

        <form v-else-if="mode === 'verify'" class="auth-form auth-form--member" novalidate :aria-busy="isSubmitting ? 'true' : 'false'" @submit.prevent="$emit('submit-resend')">
          <div class="auth-account-preview">
            <span>Verification email</span>
            <strong>{{ verificationEmail }}</strong>
          </div>

          <button type="submit" class="primary-button auth-form__submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Sending...' : 'Resend verification email' }}
          </button>

          <button type="button" class="ghost-button auth-form__submit" @click="goEmail">
            Use another email
          </button>
        </form>

        <form v-else class="auth-form auth-form--member auth-form--register" novalidate :aria-busy="isSubmitting ? 'true' : 'false'" @submit.prevent="submitRegisterForm">
          <label>
            <span class="auth-label">Email <strong>*</strong></span>
            <span class="auth-input-field">
              <input
                v-model.trim="registerEmailValue"
                type="email"
                autocomplete="email"
                :aria-invalid="Boolean(errors.registerEmail)"
                @input="clearError('registerEmail')"
              />
              <span
                v-if="emailState(registerForm.email, 'registerEmail')"
                class="auth-validation-icon"
                :class="`auth-validation-icon--${emailState(registerForm.email, 'registerEmail')}`"
                aria-hidden="true"
              ></span>
            </span>
            <small v-if="errors.registerEmail" class="auth-field-error">{{ errors.registerEmail }}</small>
          </label>

          <label>
            <span class="auth-label">Password <strong>*</strong></span>
            <span class="auth-input-field auth-password-field">
              <input
                v-model="registerPasswordValue"
                :type="showRegisterPassword ? 'text' : 'password'"
                autocomplete="new-password"
                minlength="8"
                maxlength="25"
                placeholder="Create a password"
                :aria-invalid="Boolean(errors.registerPassword)"
                @input="clearRegisterPasswordInput"
              />
              <span
                v-if="passwordState(registerForm.password, 'registerPassword', true)"
                class="auth-validation-icon auth-validation-icon--password"
                :class="`auth-validation-icon--${passwordState(registerForm.password, 'registerPassword', true)}`"
                aria-hidden="true"
              ></span>
              <button type="button" class="auth-field-action auth-field-action--password" :aria-label="showRegisterPassword ? 'Hide password' : 'Show password'" @click="togglePasswordVisibility('register')">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </span>
            <small v-if="errors.registerPassword" class="auth-field-error">{{ errors.registerPassword }}</small>
          </label>

          <div class="auth-password-strength" :class="`auth-password-strength--${registerPasswordStrengthTone}`">
            <span>
              <b>Password strength</b>
              {{ registerPasswordStrengthLabel }}
            </span>
            <div aria-hidden="true">
              <i v-for="step in 4" :key="step" :class="{ 'is-active': step <= registerPasswordStrengthScore }"></i>
            </div>
          </div>

          <ul class="auth-password-rules" aria-label="Password rules">
            <li :class="{ 'is-valid': registerPasswordRequirements.length, 'is-invalid': hasRegisterPasswordFeedback && !registerPasswordRequirements.length }">
              <span>{{ registerPasswordRequirements.length ? '✓' : '×' }}</span>
              Use 8 to 25 characters.
            </li>
            <li :class="{ 'is-valid': registerPasswordRequirements.complexity, 'is-invalid': hasRegisterPasswordFeedback && !registerPasswordRequirements.complexity }">
              <span>{{ registerPasswordRequirements.complexity ? '✓' : '×' }}</span>
              Include 1 number, 1 uppercase letter, and 1 lowercase letter.
            </li>
            <li :class="{ 'is-valid': registerPasswordRequirements.noSpaces, 'is-invalid': hasRegisterPasswordFeedback && !registerPasswordRequirements.noSpaces }">
              <span>{{ registerPasswordRequirements.noSpaces ? '✓' : '×' }}</span>
              Do not use spaces.
            </li>
          </ul>

          <label>
            <span class="auth-label">Confirm password <strong>*</strong></span>
            <span class="auth-input-field auth-password-field">
              <input
                v-model="registerConfirmPasswordValue"
                :type="showRegisterConfirmPassword ? 'text' : 'password'"
                autocomplete="new-password"
                minlength="8"
                maxlength="25"
                placeholder="Confirm your password"
                :aria-invalid="Boolean(errors.registerConfirmPassword)"
                @input="clearError('registerConfirmPassword')"
              />
              <span
                v-if="registerConfirmPasswordState"
                class="auth-validation-icon auth-validation-icon--password"
                :class="`auth-validation-icon--${registerConfirmPasswordState}`"
                aria-hidden="true"
              ></span>
              <button type="button" class="auth-field-action auth-field-action--password" :aria-label="showRegisterConfirmPassword ? 'Hide confirm password' : 'Show confirm password'" @click="togglePasswordVisibility('registerConfirm')">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </span>
            <small v-if="errors.registerConfirmPassword" class="auth-field-error">{{ errors.registerConfirmPassword }}</small>
          </label>

          <label>
            <span class="auth-label">Birthday <strong>*</strong></span>
            <span class="auth-input-field auth-date-field">
              <input
                :value="birthDateMask"
                type="text"
                inputmode="numeric"
                placeholder="DD/MM/YYYY"
                maxlength="10"
                :aria-invalid="Boolean(errors.birthDate)"
                @input="handleBirthDateInput"
                @keydown="handleBirthDateKeydown"
                @paste="handleBirthDatePaste"
              />
              <span
                v-if="birthDateState()"
                class="auth-validation-icon auth-validation-icon--date"
                :class="`auth-validation-icon--${birthDateState()}`"
                aria-hidden="true"
              ></span>
              <button type="button" class="auth-field-action auth-field-action--calendar" aria-label="Choose birthday from calendar" @click="openBirthDatePicker">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
                </svg>
              </button>
              <input
                ref="birthDatePicker"
                v-model="registerBirthDatePickerValue"
                class="auth-date-native"
                type="date"
                tabindex="-1"
                aria-hidden="true"
                @change="syncBirthDateFromPicker"
              />
            </span>
            <small v-if="errors.birthDate" class="auth-field-error">{{ errors.birthDate }}</small>
          </label>

          <button type="button" class="auth-form__text-action auth-register__wide" @click="toggleOptionalInformation">
            {{ registerForm.showOptional ? 'Hide optional information' : 'Add optional information' }}
          </button>

          <label v-if="registerForm.showOptional" class="auth-register__wide">
            <span>Full name</span>
            <input v-model.trim="registerFullNameValue" type="text" autocomplete="name" placeholder="Your full name" />
          </label>

          <button type="submit" class="primary-button auth-form__submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Creating account...' : 'Create account' }}
          </button>

          <button type="button" class="ghost-button auth-form__submit" @click="goEmail">
            Back to sign in
          </button>
        </form>
      </section>
    </div>
  </transition>
</template>

<script>
import { authModalMethods } from './logic/authModalMethods';
import { formatBirthDateMask } from './logic/authModalValidation';

export default {
  name: 'AuthModal',
  props: {
    open: {
      type: Boolean,
      default: false
    },
    mode: {
      type: String,
      default: 'email'
    },
    message: {
      type: String,
      default: ''
    },
    isSubmitting: {
      type: Boolean,
      default: false
    },
    emailForm: {
      type: Object,
      required: true
    },
    loginForm: {
      type: Object,
      required: true
    },
    registerForm: {
      type: Object,
      required: true
    },
    forgotForm: {
      type: Object,
      required: true
    }
  },
  emits: ['close', 'set-mode', 'submit-email', 'submit-login', 'submit-register', 'submit-forgot', 'submit-resend', 'update-form-field'],
  data() {
    return {
      showLoginPassword: false,
      showRegisterPassword: false,
      showRegisterConfirmPassword: false,
      loginPasswordTimer: null,
      registerPasswordTimer: null,
      registerConfirmPasswordTimer: null,
      errors: {}
    };
  },
  computed: {
    emailValue: {
      get() {
        return this.emailForm.email;
      },
      set(value) {
        this.updateFormField('email', 'email', value);
      }
    },
    loginPasswordValue: {
      get() {
        return this.loginForm.password;
      },
      set(value) {
        this.updateFormField('login', 'password', value);
      }
    },
    forgotEmailValue: {
      get() {
        return this.forgotForm.email;
      },
      set(value) {
        this.updateFormField('forgot', 'email', value);
      }
    },
    registerEmailValue: {
      get() {
        return this.registerForm.email;
      },
      set(value) {
        this.updateFormField('register', 'email', value);
      }
    },
    registerPasswordValue: {
      get() {
        return this.registerForm.password;
      },
      set(value) {
        this.updateFormField('register', 'password', value);
      }
    },
    registerConfirmPasswordValue: {
      get() {
        return this.registerForm.confirmPassword;
      },
      set(value) {
        this.updateFormField('register', 'confirmPassword', value);
      }
    },
    registerBirthDatePickerValue: {
      get() {
        return this.registerForm.birthDatePicker;
      },
      set(value) {
        this.updateFormField('register', 'birthDatePicker', value);
      }
    },
    registerFullNameValue: {
      get() {
        return this.registerForm.fullName;
      },
      set(value) {
        this.updateFormField('register', 'fullName', value);
      }
    },
    birthDateMask() {
      return formatBirthDateMask(this.registerForm.birthDate);
    },
    verificationEmail() {
      return this.loginForm.email || this.emailForm.email || this.registerForm.email || this.forgotForm.email || '';
    },
    modalTitle() {
      if (this.mode === 'login') return 'Login to your account';
      if (this.mode === 'register') return 'Create your HEM membership';
      if (this.mode === 'forgot') return 'Reset your password';
      if (this.mode === 'verify') return 'Verify your email';
      return 'Sign in with your email';
    },
    modalCopy() {
      if (this.message && this.mode !== 'forgot') return this.message;
      if (this.mode === 'login') return 'Enter your password to continue shopping with saved favorites, cart, and orders.';
      if (this.mode === 'register') return 'Create your account to save favorites, manage your bag, and track orders.';
      if (this.mode === 'forgot') return 'We will prepare a password reset email with a 24-hour secure link.';
      if (this.mode === 'verify') return 'Open the verification link within 10 minutes to activate your account.';
      return 'Sign in with your email or register to become a HEM member.';
    },
    registerPasswordRequirements() {
      const password = String(this.registerForm.password || '');

      return {
        length: password.length >= 8 && password.length <= 25,
        complexity: /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password),
        noSpaces: password.length > 0 && !/\s/.test(password)
      };
    },
    hasRegisterPasswordFeedback() {
      return Boolean(this.registerForm.password) || Boolean(this.errors.registerPassword);
    },
    registerPasswordStrengthScore() {
      return Object.values(this.registerPasswordRequirements).filter(Boolean).length + (String(this.registerForm.password || '').length >= 12 ? 1 : 0);
    },
    registerPasswordStrengthLabel() {
      if (!this.registerForm.password) return 'Not started';
      if (this.registerPasswordStrengthScore <= 1) return 'Weak';
      if (this.registerPasswordStrengthScore <= 3) return 'Good';
      return 'Strong';
    },
    registerPasswordStrengthTone() {
      if (!this.registerForm.password) return 'idle';
      if (this.registerPasswordStrengthScore <= 1) return 'weak';
      if (this.registerPasswordStrengthScore <= 3) return 'good';
      return 'strong';
    },
    registerConfirmPasswordState() {
      const confirmPassword = String(this.registerForm.confirmPassword || '');

      if (this.errors.registerConfirmPassword) return 'invalid';
      if (!confirmPassword) return '';

      return confirmPassword === this.registerForm.password ? 'valid' : 'invalid';
    }
  },
  watch: {
    mode() {
      this.errors = {};
      this.hidePassword('login');
      this.hidePassword('register');
      this.hidePassword('registerConfirm');
    }
  },
  beforeUnmount() {
    this.clearPasswordTimer('login');
    this.clearPasswordTimer('register');
    this.clearPasswordTimer('registerConfirm');
  },
  methods: authModalMethods
};
</script>

<style scoped src="./AuthModal.css"></style>
