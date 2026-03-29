import { Router } from 'express';
import { logout, me } from '../controllers/authController.js';
import { requireAuthenticated } from '../middleware/authSession.js';

const router = Router();

router.post('/auth/logout', requireAuthenticated, logout);
router.get('/auth/me', requireAuthenticated, me);

export default router;
