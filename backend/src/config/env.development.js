export default {
  appName: 'TogetherHere API (Development)',
  logLevel: 'info',
  enableRequestLog: true,
  dbSsl: false,
  authTransportStrategy: 'cookie-session',
  frontendOriginAllowlistSource: 'CORS_ALLOWED_ORIGINS',
  corsAllowedOrigins: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  corsAllowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  corsAllowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  sessionCookieSecure: false,
  sessionCookieSameSite: 'Lax',
  csrfCookieSecure: false,
  csrfCookieSameSite: 'Strict'
};
