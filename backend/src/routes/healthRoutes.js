import { Router } from 'express';
import { getHealth } from '../controllers/healthController.js';
import { getCsrfToken } from '../controllers/securityController.js';

const router = Router();

router.get('/health', getHealth);
router.get('/csrf-token', getCsrfToken);

export default router;
