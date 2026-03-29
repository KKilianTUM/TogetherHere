import { Router } from 'express';
import { updateProfile } from '../controllers/profileController.js';
import { requireSession } from '../middleware/authMiddleware.js';

const router = Router();

router.patch('/profile', requireSession(['member']), updateProfile);

export default router;
