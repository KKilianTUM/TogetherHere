import { Router } from 'express';
import { login, logout, me, register } from '../controllers/authController.js';
import { requireAuthenticated } from '../middleware/authSession.js';

const router = Router();

router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/logout', requireAuthenticated, logout);
router.get('/auth/me', requireAuthenticated, me);

export default router;
