import { Router } from 'express';

import { getMe, updateProfile } from '../controllers/user.controller';
import { authUser } from '../middlewares/auth.middleware';

const router = Router();

router.route('/').patch(authUser, updateProfile);
router.get('/me', authUser, getMe);

export default router;
