const AUTH_STATES = {
  UNKNOWN: "unknown",
  LOADING: "loading",
  AUTHENTICATED: "authenticated",
  GUEST: "guest"
};

let currentState = {
  status: AUTH_STATES.UNKNOWN,
  user: null,
  resolvedAt: null
};

let bootstrapPromise = null;
const listeners = new Set();

function notifyListeners() {
  listeners.forEach((listener) => listener(currentState));
}

function setState(nextState) {
  currentState = {
    ...currentState,
    ...nextState,
    resolvedAt: new Date().toISOString()
  };
  notifyListeners();
  return currentState;
}

function clearLegacyAuthStorage() {
  const legacyKeys = ["token", "authToken", "sessionToken", "user", "currentUser"];
  legacyKeys.forEach((key) => {
    window.localStorage?.removeItem(key);
    window.sessionStorage?.removeItem(key);
  });
}

export function subscribeAuthState(listener) {
  listeners.add(listener);
  listener(currentState);
  return () => listeners.delete(listener);
}

export function getAuthState() {
  return currentState;
}

export function setAuthenticatedUser(user) {
  return setState({ status: AUTH_STATES.AUTHENTICATED, user: user || null });
}

export function markLoggedOut() {
  return setState({ status: AUTH_STATES.GUEST, user: null });
}

export async function bootstrapAuthState() {
  if (currentState.status === AUTH_STATES.AUTHENTICATED || currentState.status === AUTH_STATES.GUEST) {
    return currentState;
  }

  if (bootstrapPromise) return bootstrapPromise;

  setState({ status: AUTH_STATES.LOADING, user: null });
  clearLegacyAuthStorage();

  bootstrapPromise = fetch("/auth/me", {
    method: "GET",
    credentials: "include"
  })
    .then(async (response) => {
      if (!response.ok) {
        setState({ status: AUTH_STATES.GUEST, user: null });
        return currentState;
      }

      const payload = await response.json().catch(() => null);
      const user = payload?.user ?? null;

      if (!user) {
        setState({ status: AUTH_STATES.GUEST, user: null });
        return currentState;
      }

      setState({ status: AUTH_STATES.AUTHENTICATED, user });
      return currentState;
    })
    .catch(() => {
      setState({ status: AUTH_STATES.GUEST, user: null });
      return currentState;
    })
    .finally(() => {
      bootstrapPromise = null;
    });

  return bootstrapPromise;
}

export function isAuthenticated() {
  return currentState.status === AUTH_STATES.AUTHENTICATED;
}
