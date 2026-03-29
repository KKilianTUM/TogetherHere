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
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body)
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
