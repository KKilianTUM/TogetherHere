import { Router } from 'express';
import {
  confirmVerificationToken,
  forgotPassword,
  issueVerificationToken,
  login,
  register,
  resendVerificationToken,
  resetPasswordWithToken
} from '../controllers/authController.js';
import { authRateLimit } from '../middleware/authRateLimit.js';

const router = Router();

router.post('/auth/register', authRateLimit, register);
router.post('/auth/login', authRateLimit, login);
router.post('/auth/forgot-password', authRateLimit, forgotPassword);
router.post('/auth/reset-password', authRateLimit, resetPasswordWithToken);
router.post('/auth/verification/issue', authRateLimit, issueVerificationToken);
router.post('/auth/verification/resend', authRateLimit, resendVerificationToken);
router.post('/auth/verification/confirm', authRateLimit, confirmVerificationToken);

export default router;
