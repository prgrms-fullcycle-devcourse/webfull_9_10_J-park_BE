import { Router } from 'express';

import { authUser } from '../middlewares/auth.middleware';
import { getRanks } from '../controllers/ranking.controller';

const router = Router();

router.get('/', authUser, getRanks);

export default router;
