import { securityLog } from './securityLogger.js';

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

const loginRateLimitByIp = new Map();
const loginRateLimitByAccount = new Map();
const registerRateLimitByIp = new Map();
const registerRateLimitByAccount = new Map();

const loginFailuresByAccount = new Map();
const ipFailurePatterns = new Map();

function normalizeIdentifier(rawIdentifier) {
  if (!rawIdentifier || typeof rawIdentifier !== 'string') {
    return null;
  }

  return rawIdentifier.trim().toLowerCase();
}

function pruneAttempts(attempts, now, windowMs) {
  while (attempts.length > 0 && now - attempts[0] > windowMs) {
    attempts.shift();
  }
}

function getRateBucket(map, key) {
  const existing = map.get(key);
  if (existing) {
    return existing;
  }

  const bucket = [];
  map.set(key, bucket);
  return bucket;
}

function checkAndConsumeRateLimit(map, key, limit, now, route, dimension, metadata = {}) {
  const bucket = getRateBucket(map, key);

  pruneAttempts(bucket, now, RATE_LIMIT_WINDOW_MS);

  if (bucket.length >= limit) {
    const retryAfterSeconds = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - bucket[0])) / 1000);

    securityLog('auth.rate_limit_exceeded', {
      route,
      dimension,
      key,
      limit,
      retryAfterSeconds,
      ...metadata
    });

    return {
      blocked: true,
      retryAfterSeconds
    };
  }

  bucket.push(now);

  return {
    blocked: false,
    retryAfterSeconds: 0
  };
}

function getAccountIdentifierFromBody(body = {}) {
  return normalizeIdentifier(body.email || body.account || body.username);
}

export function checkAuthRateLimits({ route, ipAddress, body = {} }) {
  const now = Date.now();
  const accountIdentifier = getAccountIdentifierFromBody(body);

  const isLoginRoute = route === '/auth/login';

  const limitByIp = isLoginRoute ? 50 : 30;
  const limitByAccount = isLoginRoute ? 12 : 8;

  const ipMap = isLoginRoute ? loginRateLimitByIp : registerRateLimitByIp;
  const accountMap = isLoginRoute ? loginRateLimitByAccount : registerRateLimitByAccount;

  const ipCheck = checkAndConsumeRateLimit(ipMap, ipAddress, limitByIp, now, route, 'ip');
  if (ipCheck.blocked) {
    return ipCheck;
  }

  if (accountIdentifier) {
    const accountCheck = checkAndConsumeRateLimit(
      accountMap,
      accountIdentifier,
      limitByAccount,
      now,
      route,
      'account',
      { ipAddress }
    );

    if (accountCheck.blocked) {
      return accountCheck;
    }
  }

  return {
    blocked: false,
    retryAfterSeconds: 0
  };
}

function calculateLockoutSeconds(failureCount) {
  if (failureCount < 5) {
    return 0;
  }

  return Math.min(15 * 60, 2 ** (failureCount - 5) * 30);
}

function getFailureState(accountIdentifier, { createIfMissing = false } = {}) {
  const existing = loginFailuresByAccount.get(accountIdentifier);

  if (existing || !createIfMissing) {
    return existing || null;
  }

  const created = {
    failureCount: 0,
    lockedUntil: 0,
    lastFailedAt: 0
  };

  loginFailuresByAccount.set(accountIdentifier, created);
  return created;
}

export function checkLoginLockout({ accountIdentifier, ipAddress }) {
  const normalized = normalizeIdentifier(accountIdentifier);
  if (!normalized) {
    return { blocked: false, retryAfterSeconds: 0 };
  }

  const state = getFailureState(normalized);
  if (!state) {
    return { blocked: false, retryAfterSeconds: 0 };
  }

  const now = Date.now();
  if (state.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((state.lockedUntil - now) / 1000);

    securityLog('auth.login_temporarily_locked', {
      accountIdentifier: normalized,
      ipAddress,
      retryAfterSeconds,
      failureCount: state.failureCount
    });

    return {
      blocked: true,
      retryAfterSeconds
    };
  }

  return {
    blocked: false,
    retryAfterSeconds: 0
  };
}

function trackSuspiciousIpPattern({ ipAddress, accountIdentifier }) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;

  const current = ipFailurePatterns.get(ipAddress) || {
    failures: [],
    identifiers: new Set()
  };

  current.failures.push(now);
  if (accountIdentifier) {
    current.identifiers.add(accountIdentifier);
  }

  pruneAttempts(current.failures, now, windowMs);

  if (current.failures.length === 0) {
    current.identifiers.clear();
  }

  ipFailurePatterns.set(ipAddress, current);

  if (current.failures.length >= 8 && current.identifiers.size >= 3) {
    securityLog('auth.suspicious_multi_account_failures', {
      ipAddress,
      failuresInWindow: current.failures.length,
      distinctIdentifiersInWindow: current.identifiers.size,
      windowSeconds: Math.floor(windowMs / 1000)
    });
  }
}

export function registerLoginFailure({ accountIdentifier, ipAddress }) {
  const normalized = normalizeIdentifier(accountIdentifier);
  if (!normalized) {
    return { retryAfterSeconds: 0 };
  }

  const state = getFailureState(normalized, { createIfMissing: true });
  state.failureCount += 1;
  state.lastFailedAt = Date.now();

  const lockoutSeconds = calculateLockoutSeconds(state.failureCount);
  if (lockoutSeconds > 0) {
    state.lockedUntil = Date.now() + lockoutSeconds * 1000;

    securityLog('auth.login_lockout_applied', {
      accountIdentifier: normalized,
      ipAddress,
      failureCount: state.failureCount,
      lockoutSeconds
    });
  }

  trackSuspiciousIpPattern({ ipAddress, accountIdentifier: normalized });

  return {
    retryAfterSeconds: lockoutSeconds
  };
}

export function registerLoginSuccess({ accountIdentifier }) {
  const normalized = normalizeIdentifier(accountIdentifier);
  if (!normalized) {
    return;
  }

  loginFailuresByAccount.delete(normalized);
}
