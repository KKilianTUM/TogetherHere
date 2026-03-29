export default {
  appName: 'TogetherHere API (Production)',
  logLevel: 'warn',
  enableRequestLog: true,
  dbSsl: true,
  authTransportStrategy: 'cookie-session',
  frontendOriginAllowlistSource: 'CORS_ALLOWED_ORIGINS',
  corsAllowedOrigins: [],
  corsAllowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  corsAllowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  sessionCookieSecure: true,
  sessionCookieSameSite: 'Lax',
  csrfCookieSecure: true,
  csrfCookieSameSite: 'Strict'
};
