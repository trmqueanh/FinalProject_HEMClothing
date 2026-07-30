import { authStore } from '../../stores/authStore';
import { cartStore } from '../../stores/cartStore';
import { favoritesStore } from '../../stores/wishlistStore';
import { authApi } from '../../services/authApi';

// Auth modal, session, and post-login cart/wishlist actions for ShopLayout.
export const shopLayoutAuthMethods = {
  updateAuthFormField({ form, field, value } = {}) {
    const forms = {
      email: this.authEmailForm,
      login: this.loginForm,
      register: this.registerForm,
      forgot: this.forgotForm
    };
    const targetForm = forms[form];

    if (!targetForm || !Object.prototype.hasOwnProperty.call(targetForm, field)) return;
    targetForm[field] = value;
  },
  setAuthMode(mode) {
    const redirectPath = this.$route.query.redirect || this.$route.fullPath;
    this.authMode = mode;
    this.$router.replace({
      path: this.$route.path,
      query: { ...this.routeQueryWithoutAuth(), auth: mode, redirect: redirectPath }
    });
  },
  openAuthModal(request = 'email') {
    const options = typeof request === 'string' ? { mode: request } : request || {};
    const mode = ['email', 'login', 'register', 'forgot', 'verify'].includes(options.mode) ? options.mode : 'email';
    const redirectPath = options.redirect || this.$route.query.redirect || this.$route.fullPath;

    this.authMode = mode;
    this.authMessage = String(options.message || '');
    this.pendingAuthAction = options.pendingAction || null;
    this.closeMenu();
    this.$router.push({
      path: this.$route.path,
      query: { ...this.routeQueryWithoutAuth(), auth: mode, redirect: redirectPath }
    });
  },
  closeAuthModal() {
    this.authMode = '';
    this.clearPendingAuthAction();
    this.$router.push({ path: this.$route.path, query: this.routeQueryWithoutAuth() });
  },
  clearPendingAuthAction() {
    this.authMessage = '';
    this.pendingAuthAction = null;
  },
  async completePendingAuthAction() {
    const action = this.pendingAuthAction;
    this.clearPendingAuthAction();

    if (!action || !this.isUser) return;

    if (action.type === 'wishlist' && action.productId) {
      await favoritesStore.sync();
      if (!favoritesStore.isFavorite(action.productId, action.colorVariantId || '')) {
        await favoritesStore.toggleItem(action.productId, action.colorVariantId || '', {
          product: action.product || null
        });
      }
      return;
    }

    if (action.type === 'cart' && action.product) {
      await cartStore.sync();
      await cartStore.addItem({
        product: action.product,
        quantity: Number(action.quantity || 1),
        size: action.size,
        color: action.color,
        colorVariantId: action.colorVariantId
      });
    }
  },
  resetForms() {
    this.loginForm.password = '';
    this.registerForm.password = '';
    this.registerForm.confirmPassword = '';
  },
  redirectAfterAuth(user) {
    if (user && user.role === 'admin') {
      this.$router.push('/studio');
      return;
    }

    const nextPath = this.$route.query.redirect || this.currentStorePath();
    this.$router.push(nextPath || '/women');
  },
  async submitLogin() {
    this.isSubmitting = true;
    const response = await authApi.login(this.loginForm);
    this.isSubmitting = false;

    if (response && response.error) {
      if (response.code === 'EMAIL_NOT_VERIFIED') {
        const email = String(response.email || this.loginForm.email || '').trim();
        this.authEmailForm.email = email;
        this.loginForm.email = email;
        this.registerForm.email = email;
        this.forgotForm.email = email;
        this.authMessage = response.message || 'Please verify your email before signing in.';
        this.setAuthMode('verify');
        return;
      }

      if (response.code === 'EMAIL_VERIFICATION_EXPIRED') {
        this.flash(response.message || 'Your email verification expired. Please create your account again.', 'error');
        this.setAuthMode('register');
        return;
      }

      if (this.$refs.authModal && typeof this.$refs.authModal.setFieldError === 'function') {
        this.$refs.authModal.setFieldError('loginPassword', response.message || 'Incorrect password. Please try again.');
      }
      return;
    }

    if (!response || !response.token || !response.user) return;
    authStore.setSession(response);
    this.resetForms();
    this.flash('Signed in successfully.', 'success');

    if (response.user.role === 'admin') {
      this.clearPendingAuthAction();
      this.redirectAfterAuth(response.user);
      return;
    }

    const redirectPath = this.$route.query.redirect || '';

    await this.$router.replace({
      path: this.$route.path,
      query: this.routeQueryWithoutAuth(),
      hash: this.$route.hash
    });
    await this.completePendingAuthAction();
    if (redirectPath) await this.$router.push(redirectPath);
  },
  async submitEmailCheck() {
    const email = String(this.authEmailForm.email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

    this.isSubmitting = true;
    const response = await authApi.checkEmail({ email });
    this.isSubmitting = false;
    if (!response) return;

    this.loginForm.email = email;
    this.registerForm.email = email;
    this.forgotForm.email = email;
    if (response.pendingVerification) {
      this.authMessage = 'This email is waiting for verification. Check your inbox or resend the verification email.';
      this.setAuthMode('verify');
      return;
    }

    this.setAuthMode(response.exists ? 'login' : 'register');
  },
  async submitRegister() {
    const password = String(this.registerForm.password || '');
    const confirmPassword = String(this.registerForm.confirmPassword || '');
    const hasValidPassword =
      password.length >= 8 &&
      password.length <= 25 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /\d/.test(password) &&
      !/\s/.test(password);

    if (!hasValidPassword || confirmPassword !== password) return;
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(String(this.registerForm.birthDate || '').trim())) return;

    this.isSubmitting = true;
    const response = await authApi.register(this.registerForm);
    this.isSubmitting = false;

    if (response && response.requiresEmailVerification) {
      const email = String(response.email || this.registerForm.email || '').trim();
      this.authEmailForm.email = email;
      this.loginForm.email = email;
      this.registerForm.email = email;
      this.forgotForm.email = email;
      this.resetForms();
      this.authMessage = response.message || 'Please check your email to verify your HEM account.';
      this.flash('Check your email to verify your HEM account.', 'success');
      this.setAuthMode('verify');
      return;
    }

    if (!response || !response.token || !response.user) return;

    authStore.setSession(response);
    this.resetForms();
    this.flash('Welcome to HEM.', 'success');
    const redirectPath = this.$route.query.redirect || '';
    await this.$router.replace({
      path: this.$route.path,
      query: this.routeQueryWithoutAuth(),
      hash: this.$route.hash
    });
    await this.completePendingAuthAction();
    if (redirectPath) await this.$router.push(redirectPath);
  },
  async submitResendVerification() {
    const email = String(this.loginForm.email || this.authEmailForm.email || this.registerForm.email || '').trim();

    if (!email) {
      this.flash('Please enter your email first.', 'error');
      this.setAuthMode('email');
      return;
    }

    this.isSubmitting = true;
    const response = await authApi.resendEmailVerification({ email });
    this.isSubmitting = false;

    if (response && response.error) {
      this.flash(response.message || 'Unable to resend verification email.', 'error');
      return;
    }

    this.authMessage = 'Verification email sent. Please check your inbox within 10 minutes.';
    this.flash('Verification email sent.', 'success');
  },
  async submitForgotPassword() {
    const email = String(this.forgotForm.email || this.loginForm.email || '').trim();

    if (!email) {
      this.flash('Please enter your email first.', 'error');
      return;
    }

    this.isSubmitting = true;
    const response = await authApi.requestPasswordReset({ email });
    this.isSubmitting = false;
    if (!response) return;

    this.flash('Password reset instructions have been sent if the account exists.', 'success');
  },
  async refreshCart() {
    if (!this.isUser) {
      this.cartCount = 0;
      this.cartItems = [];
      return;
    }

    await cartStore.sync();
    this.cartCount = cartStore.countItems();
    this.cartItems = cartStore.getItems();
  },
  async refreshFavorites() {
    if (!this.isUser) return;
    await favoritesStore.sync();
  },
  async validateSession() {
    if (!authStore.isAuthenticated()) return;

    const currentUser = await authApi.getCurrentUser();
    if (!currentUser) {
      authStore.clear();
      return;
    }

    authStore.syncUser(currentUser);
  },
  requestLogout() {
    this.closeMenu();
    this.logoutConfirmContext = this.isAdminRoute ? 'admin' : 'shop';
    this.isLogoutConfirmOpen = true;
  },
  closeLogoutConfirm() {
    this.isLogoutConfirmOpen = false;
  },
  confirmLogout() {
    const shouldReturnToAdminLogin = this.logoutConfirmContext === 'admin' || this.isAdminRoute;
    this.isLogoutConfirmOpen = false;
    authStore.clear();
    this.closeMenu();
    this.closeSearchDrawer();
    this.searchHistory = [];
    this.flash('You have been logged out.', 'success');
    this.$router.push(
      shouldReturnToAdminLogin
        ? { path: '/women', query: { auth: 'email', redirect: '/studio' } }
        : '/women'
    );
  }
};
