import { Router } from 'express';

import { getMe } from '../controllers/user.controller';
import { authUser } from '../middlewares/auth.middleware';

const router = Router();

router.get('/me', authUser, getMe);

export default router;
