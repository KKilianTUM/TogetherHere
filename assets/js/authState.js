import { meRequest } from "./authApi.js";

const AUTH_STATES = {
  UNKNOWN: "unknown",
  LOADING: "loading",
  AUTHENTICATED: "authenticated",
  GUEST: "guest",
  ERROR: "error"
};

let currentState = {
  status: AUTH_STATES.UNKNOWN,
  user: null,
  error: null,
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
  return setState({ status: AUTH_STATES.AUTHENTICATED, user: user || null, error: null });
}

export function markLoggedOut() {
  return setState({ status: AUTH_STATES.GUEST, user: null, error: null });
}

function shouldSkipBootstrap(force) {
  if (force) return false;

  return currentState.status === AUTH_STATES.AUTHENTICATED || currentState.status === AUTH_STATES.GUEST;
}

export async function bootstrapAuthState(options = {}) {
  const force = Boolean(options.force);

  if (shouldSkipBootstrap(force)) {
    return currentState;
  }

  if (bootstrapPromise) return bootstrapPromise;

  setState({ status: AUTH_STATES.LOADING, user: null, error: null });
  clearLegacyAuthStorage();

  bootstrapPromise = meRequest()
    .then((result) => {
      if (result.ok) {
        const user = result.payload?.user ?? null;
        if (user) {
          setState({ status: AUTH_STATES.AUTHENTICATED, user, error: null });
          return currentState;
        }
      }

      if (result.status === 401 || result.status === 403) {
        setState({ status: AUTH_STATES.GUEST, user: null, error: null });
        return currentState;
      }

      setState({
        status: AUTH_STATES.ERROR,
        user: null,
        error: result.message || "Unable to determine authentication state."
      });
      return currentState;
    })
    .catch(() => {
      setState({
        status: AUTH_STATES.ERROR,
        user: null,
        error: "Unable to verify your session due to a network issue."
      });
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
