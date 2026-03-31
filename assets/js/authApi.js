const DEFAULT_ERROR_MESSAGE = "Request failed. Please try again.";
let csrfToken = null;

function normalizePayload(payload) {
  return payload && typeof payload === "object" ? payload : null;
}

function normalizeMessage(status, payload, fallbackMessage = DEFAULT_ERROR_MESSAGE) {
  if (payload && typeof payload.message === "string" && payload.message.trim()) {
    return payload.message.trim();
  }

  if (status >= 500) return "Server error. Please try again in a moment.";
  return fallbackMessage;
}

function isCsrfProtectedMethod(method) {
  const normalizedMethod = (method || "GET").toUpperCase();
  return !["GET", "HEAD", "OPTIONS"].includes(normalizedMethod);
}

function isCsrfErrorResponse(status, payload) {
  if (status !== 403) return false;

  const message = payload && typeof payload.message === "string" ? payload.message.toLowerCase() : "";
  return message.includes("csrf");
}

async function ensureCsrfToken(forceRefresh = false) {
  if (csrfToken && !forceRefresh) return csrfToken;

  const response = await fetch("/csrf-token", {
    method: "GET",
    credentials: "include"
  });

  const payload = normalizePayload(await response.json().catch(() => null));
  const token = payload && typeof payload.csrfToken === "string" ? payload.csrfToken.trim() : "";

  if (!token) {
    throw new Error("CSRF token is missing from /csrf-token response.");
  }

  csrfToken = token;
  return csrfToken;
}

export async function authApiRequest(path, body, options = {}) {
  const method = options.method || "POST";
  const hasBody = body !== undefined;

  if (isCsrfProtectedMethod(method)) {
    await ensureCsrfToken();
  }

  const requestHeaders = {};

  if (hasBody) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (isCsrfProtectedMethod(method)) {
    requestHeaders["x-csrf-token"] = csrfToken;
  }

  const headers = Object.keys(requestHeaders).length ? requestHeaders : undefined;

  let response = await fetch(path, {
    method,
    headers,
    credentials: "include",
    body: hasBody ? JSON.stringify(body) : undefined
  });

  let payload = normalizePayload(await response.json().catch(() => null));

  if (isCsrfProtectedMethod(method) && isCsrfErrorResponse(response.status, payload)) {
    await ensureCsrfToken(true);

    const retryHeaders = { ...(headers || {}), "x-csrf-token": csrfToken };

    response = await fetch(path, {
      method,
      headers: retryHeaders,
      credentials: "include",
      body: hasBody ? JSON.stringify(body) : undefined
    });

    payload = normalizePayload(await response.json().catch(() => null));
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
    message: normalizeMessage(response.status, payload, options.fallbackMessage)
  };
}

export function meRequest() {
  return authApiRequest("/auth/me", undefined, {
    method: "GET",
    fallbackMessage: "Unable to verify your session right now."
  });
}

export function loginRequest(credentials) {
  return authApiRequest("/auth/login", credentials, {
    fallbackMessage: "Login failed. Please try again."
  });
}

export function registerRequest(registrationPayload) {
  return authApiRequest("/auth/register", registrationPayload, {
    fallbackMessage: "Registration failed. Please review the form and try again."
  });
}

export function logoutRequest() {
  return authApiRequest("/auth/logout", undefined, {
    method: "POST",
    fallbackMessage: "Logout failed. Please try again."
  });
}
