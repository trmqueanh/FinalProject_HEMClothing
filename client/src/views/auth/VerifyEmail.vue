<template>
  <main class="page-section verify-email-view">
    <section class="shell-card verify-email-card" aria-live="polite">
      <p class="eyebrow">HEM account</p>
      <h1>{{ title }}</h1>
      <p>{{ message }}</p>

      <div class="verify-email-card__actions">
        <button v-if="status === 'success'" type="button" class="primary-button" @click="goStorefront">
          Continue shopping
        </button>
        <button v-else type="button" class="primary-button" @click="goRegister">
          Create account
        </button>
        <button type="button" class="ghost-button" @click="goLogin">
          Back to login
        </button>
      </div>
    </section>
  </main>
</template>

<script>
import { authApi } from '../../services/authApi';
import { authStore } from '../../stores/authStore';

export default {
  name: 'VerifyEmail',
  data() {
    return {
      status: 'loading',
      message: 'Verifying your email...'
    };
  },
  computed: {
    title() {
      if (this.status === 'success') return 'Email verified';
      if (this.status === 'loading') return 'Verifying email';
      return 'Verification failed';
    }
  },
  mounted() {
    this.verifyEmail();
  },
  methods: {
    async verifyEmail() {
      const token = String(this.$route.query.token || '').trim();

      if (!token) {
        this.status = 'error';
        this.message = 'Email verification link is missing.';
        return;
      }

      const response = await authApi.verifyEmail({ token });

      if (response && response.error) {
        this.status = 'error';
        this.message = response.message || 'Email verification link is invalid or expired.';
        return;
      }

      if (response && response.token && response.user) {
        authStore.setSession(response);
      }

      this.status = 'success';
      this.message = response && response.message ? response.message : 'Email verified successfully.';
      this.flash('Email verified successfully.', 'success');
    },
    goStorefront() {
      this.$router.push('/women');
    },
    goRegister() {
      this.$router.push('/women?auth=register');
    },
    goLogin() {
      this.$router.push('/women?auth=email');
    }
  }
};
</script>

<style scoped src="@/assets/styles/auth/VerifyEmail.css"></style>
