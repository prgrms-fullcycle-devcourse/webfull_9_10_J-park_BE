import { Router } from 'express';

import { getMyRisk } from '../controllers/risk.controller';
import { authUser } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authUser, getMyRisk);

export default router;
