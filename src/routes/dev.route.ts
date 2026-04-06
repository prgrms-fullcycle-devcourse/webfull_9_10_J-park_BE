import { Router } from 'express';
import { genRandDataController } from '../controllers/dev.controller';
import { authUser } from '../middlewares/auth.middleware';

const router = Router();

router.post('/test-data', authUser, genRandDataController);

export default router;
