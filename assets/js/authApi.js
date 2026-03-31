const DEFAULT_ERROR_MESSAGE = "Request failed. Please try again.";
const DEFAULT_API_BASE_CANDIDATES = ["", "/api"];

let csrfToken = null;
let activeApiBase = null;

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

function assertRelativeApiPath(path) {
  const normalizedPath = typeof path === "string" ? path.trim() : "";

  if (!normalizedPath.startsWith("/") || normalizedPath.startsWith("//") || /^https?:\/\//i.test(normalizedPath)) {
    throw new Error(`Auth API path must be relative. Received: ${path}`);
  }

  return normalizedPath;
}

function normalizeBasePath(basePath) {
  if (typeof basePath !== "string") return "";

  const trimmed = basePath.trim();
  if (!trimmed) return "";

  let normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  normalized = normalized.replace(/\/+$/, "");
  return normalized === "/" ? "" : normalized;
}

function getConfiguredBasePath() {
  const fromWindow = normalizeBasePath(typeof window !== "undefined" ? window.__TH_API_BASE__ : "");
  if (fromWindow) return fromWindow;

  const fromMeta =
    typeof document !== "undefined"
      ? normalizeBasePath(document.querySelector('meta[name="th-api-base"]')?.getAttribute("content") || "")
      : "";

  return fromMeta;
}

function getApiBaseCandidates() {
  const candidates = [];
  const configuredBase = getConfiguredBasePath();

  if (activeApiBase !== null) {
    candidates.push(activeApiBase);
  }

  if (configuredBase) {
    candidates.push(configuredBase);
  }

  candidates.push(...DEFAULT_API_BASE_CANDIDATES);

  return [...new Set(candidates.map((basePath) => normalizeBasePath(basePath)))];
}

function buildRequestPath(basePath, path) {
  return `${normalizeBasePath(basePath)}${path}` || path;
}

async function fetchWithBaseFallback(path, options, fallbackMessage = DEFAULT_ERROR_MESSAGE) {
  const requestPath = assertRelativeApiPath(path);
  const candidates = getApiBaseCandidates();

  let lastNetworkError = null;

  for (const basePath of candidates) {
    const resolvedPath = buildRequestPath(basePath, requestPath);

    try {
      const response = await fetch(resolvedPath, options);
      const payload = normalizePayload(await response.json().catch(() => null));

      if (response.status === 404 && candidates.length > 1) {
        continue;
      }

      activeApiBase = basePath;
      return {
        ok: response.ok,
        status: response.status,
        payload,
        message: normalizeMessage(response.status, payload, fallbackMessage)
      };
    } catch (error) {
      lastNetworkError = error;
    }
  }

  if (lastNetworkError) {
    throw lastNetworkError;
  }

  throw new Error(`No reachable API base for ${requestPath}`);
}

async function ensureCsrfToken(forceRefresh = false) {
  if (csrfToken && !forceRefresh) return csrfToken;

  const result = await fetchWithBaseFallback(
    "/csrf-token",
    {
      method: "GET",
      credentials: "include"
    },
    "Unable to initialize a secure session."
  );

  const token = result.payload && typeof result.payload.csrfToken === "string" ? result.payload.csrfToken.trim() : "";

  if (!result.ok || !token) {
    throw new Error("CSRF token is missing from /csrf-token response.");
  }

  csrfToken = token;
  return csrfToken;
}

export async function authApiRequest(path, body, options = {}) {
  const method = options.method || "POST";
  const hasBody = body !== undefined;
  const requestPath = assertRelativeApiPath(path);

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

  let response = await fetchWithBaseFallback(
    requestPath,
    {
      method,
      headers,
      credentials: "include",
      body: hasBody ? JSON.stringify(body) : undefined
    },
    options.fallbackMessage
  );

  if (isCsrfProtectedMethod(method) && isCsrfErrorResponse(response.status, response.payload)) {
    await ensureCsrfToken(true);

    const retryHeaders = { ...(headers || {}), "x-csrf-token": csrfToken };

    response = await fetchWithBaseFallback(
      requestPath,
      {
        method,
        headers: retryHeaders,
        credentials: "include",
        body: hasBody ? JSON.stringify(body) : undefined
      },
      options.fallbackMessage
    );
  }

  return response;
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
