export default {
  appName: 'TogetherHere API (Local)',
  logLevel: 'debug',
  enableRequestLog: true,
  dbSsl: false,
  corsAllowedOrigins: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  corsAllowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  corsAllowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
};
