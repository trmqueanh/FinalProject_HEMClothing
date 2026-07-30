// Logic sự kiện của ChangePasswordForm.vue; template và scoped CSS vẫn nằm trong component.
import {
  PASSWORD_FIELDS,
  createDefaultPasswordForm
} from './changePasswordConfig';

export const changePasswordMethods = {
    resetForm() {
      this.form = createDefaultPasswordForm();
      this.touched = {};
      this.submitAttempted = false;
      this.serverErrors = {};
      this.visible = {
        currentPassword: false,
        newPassword: false,
        confirmPassword: false
      };
    },
    touchField(field) {
      this.touched = {
        ...this.touched,
        [field]: true
      };
    },
    handleInput(field) {
      this.localSuccess = '';
      this.serverErrors = {
        ...this.serverErrors,
        [field]: ''
      };
      this.$emit('clear-server-error');
    },
    fieldError(field) {
      if (this.serverErrors[field]) return this.serverErrors[field];

      const hasValue = Boolean(this.form[field]);
      const shouldShow = this.touched[field] || this.submitAttempted || (field !== 'currentPassword' && hasValue);
      if (!shouldShow) return '';

      if (field === 'currentPassword' && !this.form.currentPassword) {
        return 'Current password is required.';
      }

      if (field === 'newPassword') {
        if (!this.form.newPassword) return 'New password is required.';
        if (!this.isNewPasswordStrong) {
          return 'Use 8-25 characters with 1 number, 1 uppercase letter, 1 lowercase letter, and no spaces.';
        }
        if (this.requiresCurrentPassword && this.form.currentPassword && this.form.currentPassword === this.form.newPassword) {
          return 'New password must be different from your current password.';
        }
      }

      if (field === 'confirmPassword') {
        if (!this.form.confirmPassword) return 'Confirm new password is required.';
        if (!this.isConfirmMatching) return 'Password confirmation does not match.';
      }

      return '';
    },
    fieldStatus(field) {
      const hasValue = Boolean(this.form[field]);
      const shouldShow = hasValue || this.touched[field] || this.submitAttempted || Boolean(this.serverErrors[field]);
      if (!shouldShow) return '';

      return this.fieldError(field) ? 'invalid' : 'valid';
    },
    fieldClass(field) {
      const status = this.fieldStatus(field);

      return {
        'change-password-field--valid': status === 'valid',
        'change-password-field--invalid': status === 'invalid'
      };
    },
    toggleVisibility(field) {
      this.visible = {
        ...this.visible,
        [field]: !this.visible[field]
      };

      if (this.visibilityTimers[field]) {
        window.clearTimeout(this.visibilityTimers[field]);
      }

      if (this.visible[field]) {
        this.visibilityTimers[field] = window.setTimeout(() => {
          this.visible = {
            ...this.visible,
            [field]: false
          };
          this.visibilityTimers[field] = null;
        }, 5000);
      }
    },
    submitForm() {
      this.submitAttempted = true;
      const fields = this.activePasswordFields || PASSWORD_FIELDS;
      this.touched = fields.reduce((nextTouched, field) => {
        nextTouched[field] = true;
        return nextTouched;
      }, {});
      this.localSuccess = '';

      if (!this.canSubmit) return;

      this.$emit('submit', {
        currentPassword: this.form.currentPassword,
        newPassword: this.form.newPassword
      });
    }
  };
