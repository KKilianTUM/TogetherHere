import { Router } from 'express';
import { createActivity, joinActivity } from '../controllers/activityController.js';
import { requireSession } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/activities', requireSession(['host']), createActivity);
router.post('/activities/:activityId/join', requireSession(['member']), joinActivity);

export default router;
