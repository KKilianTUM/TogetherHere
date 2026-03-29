import express from 'express';
import { registerCoreMiddleware, registerTerminalMiddleware } from './bootstrap/middlewareStack.js';
import { registerRoutes } from './bootstrap/routeModules.js';

const app = express();

registerCoreMiddleware(app);
registerRoutes(app);
registerTerminalMiddleware(app);

export default app;
