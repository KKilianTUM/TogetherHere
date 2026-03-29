import { Router } from 'express';
import { getAuthenticatedUserProfile, logout } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authContext.js';

const router = Router();

router.get('/auth/me', requireAuth, getAuthenticatedUserProfile);
router.post('/auth/logout', requireAuth, logout);

export default router;
