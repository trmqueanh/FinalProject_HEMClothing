<template>
  <main class="page-section reset-password-view">
    <ChangePasswordForm
      eyebrow="HEM account"
      title="Reset password"
      description="Create a new member password for your HEM account. The reset link is valid for 24 hours."
      cancel-label="Back to login"
      :form-error="formError"
      :is-submitting="isSubmitting"
      :requires-current-password="false"
      :server-error="serverError"
      :show-back-button="false"
      submit-label="Update password"
      submitting-label="Updating password..."
      @cancel="goLogin"
      @clear-server-error="clearErrors"
      @submit="submitReset"
    />
  </main>
</template>

<script>
import { authApi } from '../../services/authApi';
import ChangePasswordForm from '../../components/profile/ChangePasswordForm.vue';

export default {
  name: 'ResetPassword',
  components: {
    ChangePasswordForm
  },
  data() {
    return {
      isSubmitting: false,
      formError: '',
      serverError: null
    };
  },
  methods: {
    clearErrors() {
      this.formError = '';
      this.serverError = null;
    },
    goLogin() {
      this.$router.push('/women?auth=email');
    },
    async submitReset(payload) {
      this.clearErrors();
      const token = String(this.$route.query.token || '').trim();

      if (!token) {
        this.formError = 'Password reset link is missing.';
        return;
      }

      this.isSubmitting = true;
      const response = await authApi.resetPassword({
        token,
        password: payload.newPassword
      });
      this.isSubmitting = false;

      if (response && response.error) {
        this.formError = response.message || 'Unable to reset password.';
        return;
      }

      if (!response) {
        this.formError = 'Unable to reset password. Please try again.';
        return;
      }

      this.flash('Password updated. Please login with your new password.', 'success');
      this.goLogin();
    }
  }
};
</script>

<style scoped src="@/assets/styles/auth/ResetPassword.css"></style>
