import express from 'express';
import healthRoutes from './routes/healthRoutes.js';
import { requestLogger } from './middleware/requestLogger.js';
import { corsMiddleware, csrfProtection, securityHeaders } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

app.use(express.json());
app.use(requestLogger);
app.use(corsMiddleware);
app.use(securityHeaders);
app.use(csrfProtection);

app.use(healthRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
