import config from '../config/index.js';

const rateLimitStore = new Map();
const CLEANUP_INTERVAL_MS = 60 * 1000;

function nowMs() {
  return Date.now();
}

function toSeconds(ms) {
  return Math.max(1, Math.ceil(ms / 1000));
}

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function normalizeIdentity(inputEmail) {
  if (typeof inputEmail !== 'string') {
    return 'anonymous';
  }

  const normalized = inputEmail.trim().toLowerCase();
  return normalized || 'anonymous';
}

function obfuscateEmail(identity) {
  if (!identity.includes('@')) {
    return identity;
  }

  const [localPart, domain] = identity.split('@');
  if (!localPart || !domain) {
    return 'anonymous';
  }

  const firstChar = localPart[0] || '*';
  return `${firstChar}***@${domain}`;
}

function createSecurityEvent(eventType, details) {
  return {
    timestamp: new Date().toISOString(),
    eventType,
    category: 'security.auth',
    ...details
  };
}

function logSecurityEvent(eventType, details = {}) {
  console.warn(JSON.stringify(createSecurityEvent(eventType, details)));
}

function buildRequestKey(req) {
  const method = req.method;
  const route = req.path;
  const ip = getClientIp(req);
  const identity = normalizeIdentity(req.body?.email);

  return `${method}|${route}|${ip}|${identity}`;
}

function getRateState(key) {
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, {
      attempts: [],
      consecutiveFailures: 0,
      backoffUntil: 0,
      lockoutUntil: 0,
      lastSeenAt: nowMs()
    });
  }

  return rateLimitStore.get(key);
}

function pruneState(state, now, windowMs) {
  state.attempts = state.attempts.filter((attemptMs) => now - attemptMs <= windowMs);
}

function clearExpiredEntries(now, maxIdleMs) {
  for (const [key, state] of rateLimitStore.entries()) {
    const inactiveLongEnough = now - state.lastSeenAt > maxIdleMs;
    const noActiveTimers = state.backoffUntil <= now && state.lockoutUntil <= now;
    const noAttempts = state.attempts.length === 0;

    if (inactiveLongEnough && noActiveTimers && noAttempts) {
      rateLimitStore.delete(key);
    }
  }
}

setInterval(() => {
  clearExpiredEntries(nowMs(), config.authRateLimitWindowMs * 2);
}, CLEANUP_INTERVAL_MS).unref();

function getBlockReason(state, now) {
  if (state.lockoutUntil > now) {
    return {
      reason: 'temporary_lockout',
      retryAfterMs: state.lockoutUntil - now
    };
  }

  if (state.backoffUntil > now) {
    return {
      reason: 'progressive_backoff',
      retryAfterMs: state.backoffUntil - now
    };
  }

  return null;
}

function isFailureResponse(statusCode) {
  return statusCode === 400 || statusCode === 401 || statusCode === 409;
}

export function authRateLimit(req, res, next) {
  const now = nowMs();
  const requestKey = buildRequestKey(req);
  const state = getRateState(requestKey);
  pruneState(state, now, config.authRateLimitWindowMs);
  state.lastSeenAt = now;

  const block = getBlockReason(state, now);
  if (block) {
    const retryAfterSeconds = toSeconds(block.retryAfterMs);

    res.setHeader('Retry-After', String(retryAfterSeconds));
    logSecurityEvent('auth_rate_limit_blocked', {
      route: req.path,
      method: req.method,
      reason: block.reason,
      retryAfterSeconds,
      ip: getClientIp(req),
      identity: obfuscateEmail(normalizeIdentity(req.body?.email))
    });

    return res.status(429).json({
      error: 'Request Error',
      message: 'Too many authentication attempts. Please try again later.'
    });
  }

  res.on('finish', () => {
    const finishedAt = nowMs();
    state.lastSeenAt = finishedAt;
    pruneState(state, finishedAt, config.authRateLimitWindowMs);

    if (res.statusCode >= 200 && res.statusCode < 300) {
      rateLimitStore.delete(requestKey);
      logSecurityEvent('auth_attempt_success', {
        route: req.path,
        method: req.method,
        ip: getClientIp(req),
        identity: obfuscateEmail(normalizeIdentity(req.body?.email))
      });
      return;
    }

    if (!isFailureResponse(res.statusCode)) {
      return;
    }

    state.attempts.push(finishedAt);
    state.consecutiveFailures += 1;

    const failureCount = state.attempts.length;
    const exponentialFactor = Math.max(0, state.consecutiveFailures - 1);
    const backoffMs = Math.min(
      config.authRateLimitMaxBackoffMs,
      config.authRateLimitBaseBackoffMs * (2 ** exponentialFactor)
    );
    state.backoffUntil = Math.max(state.backoffUntil, finishedAt + backoffMs);

    logSecurityEvent('auth_attempt_failure', {
      route: req.path,
      method: req.method,
      statusCode: res.statusCode,
      failureCount,
      consecutiveFailures: state.consecutiveFailures,
      backoffSeconds: toSeconds(backoffMs),
      ip: getClientIp(req),
      identity: obfuscateEmail(normalizeIdentity(req.body?.email))
    });

    if (failureCount >= config.authRateLimitLockoutThreshold) {
      state.lockoutUntil = Math.max(state.lockoutUntil, finishedAt + config.authRateLimitLockoutMs);
      logSecurityEvent('auth_lockout_applied', {
        route: req.path,
        method: req.method,
        lockoutSeconds: toSeconds(config.authRateLimitLockoutMs),
        failureCount,
        ip: getClientIp(req),
        identity: obfuscateEmail(normalizeIdentity(req.body?.email))
      });
    }
  });

  next();
}
