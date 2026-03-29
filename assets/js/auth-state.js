const AUTH_STATE = {
  status: 'loading',
  isAuthenticated: false,
  user: null
};

window.__TH_AUTH_STATE = AUTH_STATE;

function emitAuthChange() {
  document.dispatchEvent(new CustomEvent('th:auth-changed', {
    detail: { ...AUTH_STATE }
  }));
}

function applyAuthVisibility() {
  const mode = AUTH_STATE.isAuthenticated ? 'authenticated' : 'unauthenticated';
  document.querySelectorAll('[data-auth-visible]').forEach((element) => {
    const shouldShow = element.dataset.authVisible === mode;
    element.hidden = !shouldShow;
  });
}

function currentPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function redirectToLogin() {
  const next = encodeURIComponent(currentPath());
  window.location.replace(`index.html?next=${next}`);
}

async function logout() {
  try {
    await fetch('/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
  } catch {
    // Ignore network/logout failures and still clear client auth state.
  }

  AUTH_STATE.status = 'ready';
  AUTH_STATE.isAuthenticated = false;
  AUTH_STATE.user = null;
  applyAuthVisibility();
  emitAuthChange();

  if (window.location.pathname.endsWith('/activities.html') || window.location.pathname.endsWith('activities.html')) {
    redirectToLogin();
  }
}

function bindLogoutActions() {
  document.querySelectorAll('[data-auth-action="logout"]').forEach((trigger) => {
    trigger.addEventListener('click', async (event) => {
      event.preventDefault();
      await logout();
    });
  });
}

async function hydrateAuthState() {
  try {
    const response = await fetch('/auth/me', {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      AUTH_STATE.status = 'ready';
      AUTH_STATE.isAuthenticated = false;
      AUTH_STATE.user = null;
      applyAuthVisibility();

      if (response.status === 401 && document.body.dataset.protectedRoute === 'true') {
        redirectToLogin();
        return;
      }

      emitAuthChange();
      return;
    }

    const payload = await response.json();
    AUTH_STATE.status = 'ready';
    AUTH_STATE.isAuthenticated = true;
    AUTH_STATE.user = payload?.user || null;
    applyAuthVisibility();
    emitAuthChange();
  } catch {
    AUTH_STATE.status = 'ready';
    AUTH_STATE.isAuthenticated = false;
    AUTH_STATE.user = null;
    applyAuthVisibility();

    if (document.body.dataset.protectedRoute === 'true') {
      redirectToLogin();
      return;
    }

    emitAuthChange();
  }
}

bindLogoutActions();
hydrateAuthState();
