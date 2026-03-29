const DEFAULT_SESSIONS = [
  {
    sessionId: 'sess-demo-user-1',
    token: 'token-demo-user-1',
    userId: 'user-1',
    roles: ['member']
  },
  {
    sessionId: 'sess-demo-host-1',
    token: 'token-demo-host-1',
    userId: 'host-1',
    roles: ['member', 'host']
  }
];

function parseAuthSessions() {
  const raw = process.env.AUTH_SESSIONS_JSON;

  if (!raw) {
    return DEFAULT_SESSIONS;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_SESSIONS;
  } catch {
    return DEFAULT_SESSIONS;
  }
}

export function findSessionById(sessionId) {
  const sessions = parseAuthSessions();
  return sessions.find((entry) => entry.sessionId === sessionId) || null;
}

export function hasRequiredRoles(userRoles = [], requiredRoles = []) {
  if (!requiredRoles.length) {
    return true;
  }

  const roleSet = new Set(userRoles);
  return requiredRoles.every((role) => roleSet.has(role));
}
