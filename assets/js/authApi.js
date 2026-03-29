const DEFAULT_ERROR_MESSAGE = "Request failed. Please try again.";

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

export async function authApiRequest(path, body, options = {}) {
  const method = options.method || "POST";
  const hasBody = body !== undefined;
  const headers = hasBody ? { "Content-Type": "application/json" } : undefined;

  const response = await fetch(path, {
    method,
    headers,
    credentials: "include",
    body: hasBody ? JSON.stringify(body) : undefined
  });

  const payload = normalizePayload(await response.json().catch(() => null));

  return {
    ok: response.ok,
    status: response.status,
    payload,
    message: normalizeMessage(response.status, payload, options.fallbackMessage)
  };
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
