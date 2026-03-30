import { Router } from 'express';
import { forgotPassword, login, register, resetPasswordWithToken } from '../controllers/authController.js';
import { authRateLimit } from '../middleware/authRateLimit.js';

const router = Router();

router.post('/auth/register', authRateLimit, register);
router.post('/auth/login', authRateLimit, login);
router.post('/auth/forgot-password', authRateLimit, forgotPassword);
router.post('/auth/reset-password', authRateLimit, resetPasswordWithToken);

export default router;
