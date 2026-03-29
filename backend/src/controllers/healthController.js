import { getHealthStatus } from '../services/healthService.js';

export async function getHealth(req, res, next) {
  try {
    const payload = await getHealthStatus();
    res.status(payload.status === 'ok' ? 200 : 503).json(payload);
  } catch (error) {
    next(error);
  }
}
