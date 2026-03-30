import express from 'express';
import { registerCoreMiddleware, registerTerminalMiddleware } from './bootstrap/middlewareStack.js';
import { registerRoutes } from './bootstrap/routeModules.js';

export function createApp() {
  const app = express();

  registerCoreMiddleware(app);
  registerRoutes(app);
  registerTerminalMiddleware(app);

  return app;
}

const app = createApp();

export default app;
