import { createUser, validateCredentials } from '../services/authService.js';
import {
  checkLoginLockout,
  registerLoginFailure,
  registerLoginSuccess
} from '../services/authSecurityService.js';
import { securityLog } from '../services/securityLogger.js';

function validateEmailAndPassword(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    res.status(400).json({
      error: 'Request Error',
      message: 'email and password are required'
    });
    return null;
  }

  return {
    email: String(email),
    password: String(password)
  };
}

export function register(req, res) {
  const credentials = validateEmailAndPassword(req, res);
  if (!credentials) {
    return;
  }

  const created = createUser(credentials);

  if (!created.created) {
    securityLog('auth.register_duplicate_account', {
      email: credentials.email.toLowerCase(),
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown'
    }, 'info');

    res.status(409).json({
      error: 'Request Error',
      message: 'Account already exists'
    });
    return;
  }

  res.status(201).json({
    message: 'Account created'
  });
}

export function login(req, res) {
  const credentials = validateEmailAndPassword(req, res);
  if (!credentials) {
    return;
  }

  const ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';

  const lockoutCheck = checkLoginLockout({
    accountIdentifier: credentials.email,
    ipAddress
  });

  if (lockoutCheck.blocked) {
    res.set('Retry-After', String(lockoutCheck.retryAfterSeconds));
    res.status(423).json({
      error: 'Request Error',
      message: 'Account temporarily locked due to repeated failed logins',
      retryAfterSeconds: lockoutCheck.retryAfterSeconds
    });
    return;
  }

  const result = validateCredentials(credentials);
  if (!result.valid) {
    const failureState = registerLoginFailure({
      accountIdentifier: credentials.email,
      ipAddress
    });

    if (failureState.retryAfterSeconds > 0) {
      res.set('Retry-After', String(failureState.retryAfterSeconds));
    }

    res.status(401).json({
      error: 'Request Error',
      message: 'Invalid credentials',
      ...(failureState.retryAfterSeconds > 0
        ? {
            retryAfterSeconds: failureState.retryAfterSeconds
          }
        : {})
    });

    return;
  }

  registerLoginSuccess({ accountIdentifier: credentials.email });

  res.status(200).json({
    message: 'Login successful',
    user: result.user
  });
}
