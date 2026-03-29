import { bootstrapAuthState, getAuthState, isAuthenticated } from "./authState.js";

function normalizePath(path) {
  return path.startsWith("/") ? path.slice(1) : path;
}

function redirectWithReturn(targetPath) {
  const destination = new URL(targetPath, window.location.origin);
  const returnTo = `${window.location.pathname.split("/").pop()}${window.location.search}`;

  if (targetPath.includes("login.html")) {
    destination.searchParams.set("returnTo", normalizePath(returnTo));
  }

  window.location.replace(destination.toString());
}

export async function requireAuthenticated({ redirectTo = "login.html", onError } = {}) {
  await bootstrapAuthState();
  const authState = getAuthState();

  if (authState.status === "error") {
    onError?.(authState.error);
    return false;
  }

  if (!isAuthenticated()) {
    redirectWithReturn(redirectTo);
    return false;
  }

  return true;
}

export async function requireGuest({ redirectTo = "activities.html", onError } = {}) {
  await bootstrapAuthState();
  const authState = getAuthState();

  if (authState.status === "error") {
    onError?.(authState.error);
    return false;
  }

  if (authState.status === "authenticated") {
    window.location.replace(redirectTo);
    return false;
  }

  return true;
}
