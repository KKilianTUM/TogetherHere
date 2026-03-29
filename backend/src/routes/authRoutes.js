import { Router } from 'express';
import { login, logout, me, register } from '../controllers/authController.js';
import { authRateLimit } from '../middleware/authRateLimit.js';

const router = Router();

router.post('/auth/register', authRateLimit, register);
router.post('/auth/login', authRateLimit, login);
router.post('/auth/logout', logout);
router.get('/auth/me', me);

export default router;
