import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index';
import FlashPlugin from './helpers/flash';
import './assets/styles/base/index.css';
import './assets/styles/base/largeScreens.css';

const syncShellClass = path => {
  if (typeof document === 'undefined') return;

  const pathname = String(path || '');
  const isAdminShell = pathname.startsWith('/studio') || pathname === '/admin';

  document.documentElement.classList.toggle('hem-admin-shell', isAdminShell);
  document.documentElement.classList.toggle('hem-shop-shell', !isAdminShell);
  document.body.classList.toggle('hem-admin-shell', isAdminShell);
  document.body.classList.toggle('hem-shop-shell', !isAdminShell);
};

if (typeof window !== 'undefined') {
  syncShellClass(window.location.pathname);
}

router.afterEach(to => {
  syncShellClass(to.path);
});

const app = createApp(App);

app.use(router);
app.use(FlashPlugin);
app.mount('#app');
