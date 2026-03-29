import healthRoutes from '../routes/healthRoutes.js';
import authPublicRoutes from '../routes/authPublicRoutes.js';
import authProtectedRoutes from '../routes/authProtectedRoutes.js';

export function registerRoutes(app) {
  app.use(healthRoutes);
  app.use(authPublicRoutes);
  app.use(authProtectedRoutes);
}
