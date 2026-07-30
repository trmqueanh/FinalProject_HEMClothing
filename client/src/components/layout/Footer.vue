<template>
  <footer
    v-if="visible"
    class="site-footer"
    :class="{ 'site-footer--dimmed': dimmed }"
  >
    <!-- Top divider accent -->
    <div class="site-footer__accent-bar"></div>

    <div class="site-footer__container">

      <!-- BRAND -->
      <div class="site-footer__brand">
        <div class="site-footer__logo-wrap">
          <h2 class="site-footer__logo">HEM.Atelier</h2>
        </div>

        <p class="site-footer__description">
          Modern essentials for women and men.
          Minimal silhouettes designed for everyday dressing.
        </p>

        <!-- Socials -->
        <div class="site-footer__socials">
          <a href="#" aria-label="Instagram" class="site-footer__social-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
            </svg>
            <span>Instagram</span>
          </a>
          <a href="#" aria-label="Facebook" class="site-footer__social-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
            </svg>
            <span>Facebook</span>
          </a>
          <a href="#" aria-label="TikTok" class="site-footer__social-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>
            </svg>
            <span>TikTok</span>
          </a>
        </div>

        <!-- Contact -->
        <div class="site-footer__contact">
          <h3 class="site-footer__col-title">Contact</h3>
          <a href="tel:+84934195132" class="site-footer__contact-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 5.55 5.55l1.57-1.57a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            +84 934 195 132
          </a>
          <a href="mailto:hem.atelier.shop@gmail.com" class="site-footer__contact-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
            </svg>
            hem.atelier.shop@gmail.com
          </a>
        </div>
      </div>

      <!-- SHOP -->
      <div class="site-footer__column">
        <h3 class="site-footer__col-title">Shop</h3>
        <router-link to="/women" class="site-footer__link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="4"/><path d="M12 12v4m-3 4h6"/>
          </svg>
          Women
        </router-link>
        <router-link to="/men" class="site-footer__link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="10" cy="14" r="4"/><line x1="22" y1="2" x2="14" y2="10"/><polyline points="15 2 22 2 22 9"/>
          </svg>
          Men
        </router-link>
      </div>

      <!-- SUPPORT -->
      <div class="site-footer__column">
        <h3 class="site-footer__col-title">Support</h3>
        <router-link to="/size-guide" class="site-footer__link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          Size Guide
        </router-link>
        <router-link to="/shipping-policy" class="site-footer__link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          Shipping Policy
        </router-link>
        <router-link to="/refund-policy" class="site-footer__link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
          </svg>
          Return Policy
        </router-link>
        <router-link to="/privacy-policy" class="site-footer__link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Privacy Policy
        </router-link>
      </div>

      <!-- PAYMENT -->
      <div class="site-footer__column">
        <h3 class="site-footer__col-title">Payment</h3>

        <div class="site-footer__payment-list">
          <div class="site-footer__payment-card" title="Cash on Delivery">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <span>CASH ON DELIVERY</span>
          </div>
          <div class="site-footer__payment-card" title="Bank Transfer (QR Code)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM18 14h3v7h-3M14 19h2v2h-2"/>
            </svg>
            <span>BANK TRANSFER (QR)</span>
          </div>
        </div>

        <p class="site-footer__payment-note">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
          </svg>
          Secure checkout with COD or VietQR
        </p>
      </div>

    </div>

    <!-- BOTTOM BAR -->
    <div class="site-footer__bottom">
      <span class="site-footer__copy">© 2026 HEM. All rights reserved.</span>

      <div class="site-footer__bottom-links">
        <span>Terms of Use</span>
        <span class="site-footer__dot">·</span>
        <span>Cookie Policy</span>
      </div>

    </div>
  </footer>
</template>

<script>
export default {
  name: 'SiteFooter',

  props: {
    visible: {
      type: Boolean,
      default: true
    },

    dimmed: {
      type: Boolean,
      default: false
    }
  }
};
</script>

<style scoped>
/* ─── Tokens ─────────────────────────────────────────────────────────── */
.site-footer {
  /* Match header dark palette */
  --footer-bg:        #111111;
  --footer-bg-card:   #1c1c1c;
  --footer-border:    rgba(255,255,255,0.07);
  --footer-text:      rgba(255,255,255,0.88);
  --footer-muted:     rgba(255,255,255,0.42);
  --footer-accent:    #e8e0d4;
  --footer-hover:     #ffffff;
  --footer-radius:    10px;
  --footer-input-bg:  #1e1e1e;

  background: var(--footer-bg);
  color: var(--footer-text);
  padding: 72px 56px 28px;
  font-family: inherit;
}

.site-footer--dimmed { opacity: 0.72; }

/* ─── Accent bar ─────────────────────────────────────────────────────── */
.site-footer__accent-bar {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255,255,255,0.15) 30%,
    rgba(255,255,255,0.15) 70%,
    transparent 100%
  );
  margin-bottom: 64px;
}

/* ─── Grid ───────────────────────────────────────────────────────────── */
.site-footer__container {
  display: grid;
  grid-template-columns: minmax(16rem, 1.55fr) minmax(8rem, 0.75fr) minmax(11rem, 0.95fr) minmax(16rem, 1.2fr);
  gap: 52px;
  align-items: start;
}

/* ─── Brand ──────────────────────────────────────────────────────────── */
.site-footer__logo-wrap { margin-bottom: 16px; }

.site-footer__logo {
  margin: 0;
  font-size: 38px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--footer-hover);
}

.site-footer__description {
  margin: 0 0 28px;
  color: var(--footer-muted);
  line-height: 1.85;
  font-size: 13.5px;
  max-width: 280px;
}

/* ─── Socials ────────────────────────────────────────────────────────── */
.site-footer__socials {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 32px;
}

.site-footer__social-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--footer-muted);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 0.02em;
  transition: color 200ms ease, transform 200ms ease;
  width: fit-content;
}

.site-footer__social-link:hover {
  color: var(--footer-hover);
  transform: translateX(3px);
}

/* ─── Contact ────────────────────────────────────────────────────────── */
.site-footer__contact { display: flex; flex-direction: column; gap: 10px; }

.site-footer__contact-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--footer-muted);
  text-decoration: none;
  font-size: 13px;
  transition: color 200ms ease;
  width: fit-content;
}

.site-footer__contact-link:hover { color: var(--footer-hover); }

/* ─── Column headings ────────────────────────────────────────────────── */
.site-footer__col-title {
  margin: 0 0 20px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--footer-accent);
}

/* ─── Links ──────────────────────────────────────────────────────────── */
.site-footer__column {
  display: flex;
  flex-direction: column;
}

.site-footer__link {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: var(--footer-muted);
  text-decoration: none;
  font-size: 13.5px;
  padding: 5px 0;
  transition: color 200ms ease, gap 200ms ease;
  width: fit-content;
}

.site-footer__link svg {
  flex-shrink: 0;
  opacity: 0.5;
  transition: opacity 200ms ease;
}

.site-footer__link:hover {
  color: var(--footer-hover);
  gap: 12px;
}

.site-footer__link:hover svg { opacity: 1; }

.site-footer__link.is-active {
  color: var(--footer-hover);
  font-weight: 650;
}

.site-footer__link.is-active svg {
  opacity: 1;
}

.site-footer__link.is-active::after {
  width: 5px;
  height: 5px;
  margin-left: 2px;
  border-radius: 50%;
  background: var(--footer-accent);
  content: '';
}

/* ─── Payment ────────────────────────────────────────────────────────── */
.site-footer__payment-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  width: min(100%, 360px);
  margin-bottom: 16px;
}

.site-footer__payment-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 0;
  min-height: 38px;
  padding: 6px 10px;
  background: var(--footer-bg-card);
  border: 1px solid var(--footer-border);
  border-radius: 7px;
  font-size: 11px;
  font-weight: 600;
  color: var(--footer-muted);
  letter-spacing: 0.05em;
  transition: border-color 200ms, color 200ms;
}

.site-footer__payment-card:hover {
  border-color: rgba(255,255,255,0.2);
  color: var(--footer-text);
}

.site-footer__payment-note {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 0;
  color: var(--footer-muted);
  font-size: 12.5px;
  line-height: 1.5;
}

/* ─── Newsletter ─────────────────────────────────────────────────────── */
.site-footer__newsletter-text {
  margin: 0 0 12px;
  font-size: 12.5px;
  color: var(--footer-muted);
  line-height: 1.6;
}

.site-footer__newsletter-form {
  display: flex;
  align-items: center;
  border: 1px solid var(--footer-border);
  border-radius: var(--footer-radius);
  overflow: hidden;
  background: var(--footer-input-bg);
  transition: border-color 200ms;
}

.site-footer__newsletter-form:focus-within {
  border-color: rgba(255,255,255,0.25);
}

.site-footer__newsletter-input {
  flex: 1;
  padding: 10px 12px;
  background: transparent;
  border: 0;
  outline: none;
  color: var(--footer-text);
  font-size: 13px;
  font-family: inherit;
}

.site-footer__newsletter-input::placeholder { color: var(--footer-muted); }

.site-footer__newsletter-btn {
  padding: 0 12px;
  height: 38px;
  border: 0;
  background: var(--footer-accent);
  color: #111111;
  border-radius: 0 var(--footer-radius) var(--footer-radius) 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 200ms;
}

.site-footer__newsletter-btn:hover { opacity: 0.85; }

/* ─── Bottom bar ─────────────────────────────────────────────────────── */
.site-footer__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-top: 60px;
  padding-top: 22px;
  border-top: 1px solid var(--footer-border);
}

.site-footer__copy {
  color: var(--footer-muted);
  font-size: 12.5px;
}

.site-footer__bottom-links {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
}

.site-footer__bottom-links > span:not(.site-footer__dot) {
  color: var(--footer-muted);
}

.site-footer__dot { color: var(--footer-border); }

/* ─── Responsive ─────────────────────────────────────────────────────── */
@media (max-width: 1280px) {
  .site-footer__container {
    grid-template-columns: minmax(14rem, 1.4fr) minmax(7rem, 0.75fr) minmax(10rem, 0.9fr) minmax(14rem, 1.1fr);
    gap: 36px;
  }
}

@media (max-width: 1024px) {
  .site-footer__container {
    grid-template-columns: 1fr 1fr 1fr;
    gap: 40px;
  }
}

@media (max-width: 768px) {
  .site-footer {
    padding: 52px 24px 24px;
  }

  .site-footer__container {
    grid-template-columns: 1fr 1fr;
    gap: 36px;
  }

  .site-footer__brand {
    grid-column: 1 / -1;
  }

  .site-footer__bottom {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .site-footer__container {
    grid-template-columns: 1fr;
    gap: 32px;
  }
}
.site-footer {
  background: #0b0b0b;
}
</style>
