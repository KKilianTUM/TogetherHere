function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function normalizeEmail(email) {
  if (typeof email !== 'string') {
    return null;
  }

  const normalized = email.trim().toLowerCase();
  return normalized || null;
}

function obfuscateEmail(email) {
  if (!email || !email.includes('@')) {
    return 'anonymous';
  }

  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) {
    return 'anonymous';
  }

  const firstChar = localPart[0] || '*';
  return `${firstChar}***@${domain}`;
}

function createAuthEvent(eventType, details = {}) {
  return {
    timestamp: new Date().toISOString(),
    category: 'security.auth',
    eventType,
    ...details
  };
}

export function logAuthEvent(req, eventType, details = {}, level = 'info') {
  const payload = createAuthEvent(eventType, {
    method: req.method,
    route: req.path,
    ip: getClientIp(req),
    email: obfuscateEmail(normalizeEmail(details.email || req.body?.email)),
    userId: details.userId || null,
    statusCode: details.statusCode || null,
    outcome: details.outcome || 'success'
  });

  if (level === 'warn') {
    console.warn(JSON.stringify(payload));
    return;
  }

  console.info(JSON.stringify(payload));
}
