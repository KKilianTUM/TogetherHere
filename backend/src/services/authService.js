function normalizeSessionEntry(entry, index) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error(`AUTH_SESSIONS_JSON session at index ${index} must be an object.`);
  }

  const { sessionId, token, userId, roles } = entry;

  if (!sessionId || typeof sessionId !== 'string') {
    throw new Error(`AUTH_SESSIONS_JSON session at index ${index} must include a string sessionId.`);
  }

  if (!token || typeof token !== 'string') {
    throw new Error(`AUTH_SESSIONS_JSON session ${sessionId} must include a string token.`);
  }

  if (!userId || typeof userId !== 'string') {
    throw new Error(`AUTH_SESSIONS_JSON session ${sessionId} must include a string userId.`);
  }

  if (!Array.isArray(roles) || roles.length === 0 || roles.some((role) => typeof role !== 'string')) {
    throw new Error(
      `AUTH_SESSIONS_JSON session ${sessionId} must include a non-empty array of string roles.`
    );
  }

  return {
    sessionId,
    token,
    userId,
    roles
  };
}

function parseAuthSessions() {
  const raw = process.env.AUTH_SESSIONS_JSON;

  if (!raw) {
    throw new Error('AUTH_SESSIONS_JSON is required and must contain at least one session.');
  }

  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('AUTH_SESSIONS_JSON must be valid JSON.');
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('AUTH_SESSIONS_JSON must be a non-empty JSON array.');
  }

  return parsed.map((entry, index) => normalizeSessionEntry(entry, index));
}

const authSessions = parseAuthSessions();

export function findSessionById(sessionId) {
  return authSessions.find((entry) => entry.sessionId === sessionId) || null;
}

export function hasRequiredRoles(userRoles = [], requiredRoles = []) {
  if (!requiredRoles.length) {
    return true;
  }

  const roleSet = new Set(userRoles);
  return requiredRoles.every((role) => roleSet.has(role));
}
