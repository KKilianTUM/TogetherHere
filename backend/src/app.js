import express from 'express';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

app.use(express.json());
app.use(requestLogger);

app.use(healthRoutes);
app.use(authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
