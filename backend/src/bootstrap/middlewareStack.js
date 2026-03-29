import express from 'express';
import { requestLogger } from '../middleware/requestLogger.js';
import { corsMiddleware, csrfProtection, securityHeaders } from '../middleware/security.js';
import { attachAuthIdentity } from '../middleware/authSession.js';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js';

export function registerCoreMiddleware(app) {
  app.use(express.json());
  app.use(requestLogger);
  app.use(corsMiddleware);
  app.use(securityHeaders);
  app.use(csrfProtection);
  app.use(attachAuthIdentity);
}

export function registerTerminalMiddleware(app) {
  app.use(notFoundHandler);
  app.use(errorHandler);
}
