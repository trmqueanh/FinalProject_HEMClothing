const STORAGE_KEY = 'hemline-auth';
export const AUTH_MODAL_REQUEST_EVENT = 'request-auth-modal';

const safeWindow = () => (typeof window !== 'undefined' ? window : null);

const normalizeRole = value => (String(value || '').toLowerCase() === 'admin' ? 'admin' : 'user');

const normalizeUser = user => {
  if (!user || !user.id) {
    return null;
  }

  return {
    id: String(user.id),
    name: String(user.name || '').trim() || 'Customer',
    email: String(user.email || '').trim().toLowerCase(),
    role: normalizeRole(user.role),
    status: String(user.status || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active',
    emailVerified: user.emailVerified === undefined ? true : Boolean(user.emailVerified)
  };
};

const readSession = () => {
  const browserWindow = safeWindow();

  if (!browserWindow) {
    return {
      token: '',
      user: null
    };
  }

  try {
    const rawValue = browserWindow.localStorage.getItem(STORAGE_KEY);
    const parsedValue = rawValue ? JSON.parse(rawValue) : null;
    const token = parsedValue && parsedValue.token ? String(parsedValue.token) : '';
    const user = normalizeUser(parsedValue && parsedValue.user);

    if (!token || !user || user.emailVerified === false) {
      return {
        token: '',
        user: null
      };
    }

    return {
      token,
      user
    };
  } catch {
    return {
      token: '',
      user: null
    };
  }
};

const dispatchAuthEvent = session => {
  const browserWindow = safeWindow();

  if (!browserWindow) {
    return;
  }

  browserWindow.dispatchEvent(
    new CustomEvent('auth-updated', {
      detail: {
        isAuthenticated: Boolean(session && session.token && session.user),
        user: session ? session.user : null,
        role: session && session.user ? session.user.role : 'guest'
      }
    })
  );
};

export const requestAuthModal = ({ mode = 'email', message = '', pendingAction = null } = {}) => {
  const browserWindow = safeWindow();

  if (!browserWindow) {
    return;
  }

  browserWindow.dispatchEvent(
    new CustomEvent(AUTH_MODAL_REQUEST_EVENT, {
      detail: {
        mode,
        message,
        pendingAction
      }
    })
  );
};

const writeSession = session => {
  const browserWindow = safeWindow();
  const nextUser = normalizeUser(session && session.user);
  const nextToken = session && session.token ? String(session.token) : '';

  if (!browserWindow) {
    return {
      token: nextToken,
      user: nextUser
    };
  }

  if (!nextToken || !nextUser) {
    browserWindow.localStorage.removeItem(STORAGE_KEY);
    dispatchAuthEvent(null);
    return {
      token: '',
      user: null
    };
  }

  const nextSession = {
    token: nextToken,
    user: nextUser
  };

  browserWindow.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
  dispatchAuthEvent(nextSession);
  return nextSession;
};

export const authStore = {
  getSession() {
    return readSession();
  },
  getUser() {
    return readSession().user;
  },
  getToken() {
    return readSession().token;
  },
  isAuthenticated() {
    const session = readSession();
    return Boolean(session.token && session.user && session.user.emailVerified !== false);
  },
  isAdmin() {
    const user = this.getUser();
    return Boolean(user && user.role === 'admin');
  },
  isUser() {
    return this.isAuthenticated() && !this.isAdmin();
  },
  setSession(session) {
    return writeSession(session);
  },
  syncUser(user) {
    const session = readSession();

    if (!session.token) {
      return writeSession(null);
    }

    return writeSession({
      token: session.token,
      user
    });
  },
  clear() {
    return writeSession(null);
  }
};
