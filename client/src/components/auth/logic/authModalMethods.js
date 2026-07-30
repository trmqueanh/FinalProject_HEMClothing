// Logic sự kiện của AuthModal.vue; template và scoped CSS vẫn nằm trong component.
import {
  EMAIL_PATTERN,
  formatBirthDateMask,
  getBirthDateDigits,
  isStrongPassword,
  isValidBirthDate
} from './authModalValidation';

export const authModalMethods = {
    updateFormField(form, field, value) {
      this.$emit('update-form-field', {
        form,
        field,
        value
      });
    },
    toggleOptionalInformation() {
      this.updateFormField('register', 'showOptional', !this.registerForm.showOptional);
    },
    clearError(key) {
      if (!this.errors[key]) return;
      this.errors = {
        ...this.errors,
        [key]: ''
      };
    },
    clearRegisterPasswordInput() {
      this.errors = {
        ...this.errors,
        registerPassword: '',
        registerConfirmPassword: ''
      };
    },
    setFieldError(key, message) {
      this.errors = {
        ...this.errors,
        [key]: message || 'Please check this field and try again.'
      };
    },
    validateEmail(value, message = 'Please enter a valid email address.') {
      return EMAIL_PATTERN.test(String(value || '').trim()) ? '' : message;
    },
    clearPasswordTimer(kind) {
      const timerKey =
        kind === 'register'
          ? 'registerPasswordTimer'
          : kind === 'registerConfirm'
            ? 'registerConfirmPasswordTimer'
            : 'loginPasswordTimer';

      if (this[timerKey]) {
        clearTimeout(this[timerKey]);
        this[timerKey] = null;
      }
    },
    hidePassword(kind) {
      this.clearPasswordTimer(kind);

      if (kind === 'register') {
        this.showRegisterPassword = false;
        return;
      }

      if (kind === 'registerConfirm') {
        this.showRegisterConfirmPassword = false;
        return;
      }

      this.showLoginPassword = false;
    },
    togglePasswordVisibility(kind) {
      const isRegister = kind === 'register';
      const isRegisterConfirm = kind === 'registerConfirm';
      const stateKey = isRegister ? 'showRegisterPassword' : isRegisterConfirm ? 'showRegisterConfirmPassword' : 'showLoginPassword';
      const timerKey = isRegister ? 'registerPasswordTimer' : isRegisterConfirm ? 'registerConfirmPasswordTimer' : 'loginPasswordTimer';

      this[stateKey] = !this[stateKey];
      this.clearPasswordTimer(kind);

      if (this[stateKey]) {
        this[timerKey] = setTimeout(() => {
          this[stateKey] = false;
          this[timerKey] = null;
        }, 5000);
      }
    },
    emailState(value, errorKey) {
      const trimmedValue = String(value || '').trim();

      if (this.errors[errorKey]) return 'invalid';
      if (!trimmedValue) return '';

      return EMAIL_PATTERN.test(trimmedValue) ? 'valid' : 'invalid';
    },
    passwordState(value, errorKey, requireStrong = false) {
      const password = String(value || '');

      if (this.errors[errorKey]) return 'invalid';
      if (!password) return '';

      return requireStrong ? (isStrongPassword(password) ? 'valid' : 'invalid') : 'valid';
    },
    birthDateState() {
      const birthDate = String(this.registerForm.birthDate || '').trim();

      if (this.errors.birthDate) return 'invalid';
      if (!birthDate) return '';

      return isValidBirthDate(birthDate) ? 'valid' : 'invalid';
    },
    submitEmailForm() {
      const emailError = this.validateEmail(this.emailForm.email);

      if (emailError) {
        this.errors = { email: emailError };
        return;
      }

      this.errors = {};
      this.$emit('submit-email');
    },
    submitLoginForm() {
      const errors = {
        loginPassword: this.loginForm.password ? '' : 'Password is required.'
      };

      if (!EMAIL_PATTERN.test(String(this.loginForm.email || '').trim())) {
        this.goEmail();
        return;
      }

      if (errors.loginPassword) {
        this.errors = errors;
        return;
      }

      this.errors = {};
      this.$emit('submit-login');
    },
    submitForgotForm() {
      const forgotEmail = this.validateEmail(this.forgotForm.email);

      if (forgotEmail) {
        this.errors = { forgotEmail };
        return;
      }

      this.errors = {};
      this.$emit('submit-forgot');
    },
    submitRegisterForm() {
      const errors = {
        registerEmail: this.validateEmail(this.registerForm.email),
        registerPassword: isStrongPassword(this.registerForm.password)
          ? ''
          : 'Password must be 8-25 characters with 1 number, 1 uppercase letter, 1 lowercase letter, and no spaces.',
        registerConfirmPassword: this.registerForm.confirmPassword === this.registerForm.password
          ? ''
          : 'Password confirmation does not match.',
        birthDate: isValidBirthDate(this.registerForm.birthDate)
          ? ''
          : 'Birthday is required in dd/mm/yyyy format.'
      };

      if (errors.registerEmail || errors.registerPassword || errors.registerConfirmPassword || errors.birthDate) {
        this.errors = errors;
        return;
      }

      this.errors = {};
      this.$emit('submit-register');
    },
    handleBirthDateInput(event) {
      const rawValue = event && event.target ? event.target.value : this.registerForm.birthDate;
      this.updateFormField('register', 'birthDate', formatBirthDateMask(rawValue));
      this.clearError('birthDate');
    },
    handleBirthDateKeydown(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const allowedKeys = ['Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];

      if (allowedKeys.includes(event.key)) {
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        this.updateFormField(
          'register',
          'birthDate',
          formatBirthDateMask(getBirthDateDigits(this.registerForm.birthDate).slice(0, -1))
        );
        this.clearError('birthDate');
        return;
      }

      if (event.key === 'Delete') {
        event.preventDefault();
        this.updateFormField('register', 'birthDate', '');
        this.clearError('birthDate');
        return;
      }

      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        this.updateFormField(
          'register',
          'birthDate',
          formatBirthDateMask(`${getBirthDateDigits(this.registerForm.birthDate)}${event.key}`)
        );
        this.clearError('birthDate');
        return;
      }

      event.preventDefault();
    },
    handleBirthDatePaste(event) {
      event.preventDefault();
      const text = event.clipboardData ? event.clipboardData.getData('text') : '';
      this.updateFormField('register', 'birthDate', formatBirthDateMask(text));
      this.clearError('birthDate');
    },
    syncBirthDateFromPicker() {
      const value = String(this.registerForm.birthDatePicker || '');

      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return;
      }

      const [year, month, day] = value.split('-');
      this.updateFormField('register', 'birthDate', `${day}/${month}/${year}`);
      this.clearError('birthDate');
    },
    openBirthDatePicker() {
      const picker = this.$refs.birthDatePicker;

      if (!picker) return;

      if (typeof picker.showPicker === 'function') {
        picker.showPicker();
        return;
      }

      picker.click();
    },
    goForgot() {
      this.updateFormField('forgot', 'email', this.loginForm.email || this.emailForm.email || this.registerForm.email || '');
      this.$emit('set-mode', 'forgot');
    },
    goEmail() {
      this.updateFormField(
        'email',
        'email',
        this.loginForm.email || this.registerForm.email || this.forgotForm.email || this.emailForm.email || ''
      );
      this.$emit('set-mode', 'email');
    }
  };
