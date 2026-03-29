import { Router } from 'express';
import { login, register } from '../controllers/authController.js';
import { authRateLimit } from '../middleware/authRateLimit.js';

const router = Router();

router.post('/auth/register', authRateLimit('/auth/register'), register);
router.post('/auth/login', authRateLimit('/auth/login'), login);

export default router;
