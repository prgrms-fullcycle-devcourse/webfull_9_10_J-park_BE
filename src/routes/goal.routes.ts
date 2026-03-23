import { Router } from 'express';
import { createGoalController } from '../controllers/goal.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', authMiddleware, createGoalController);

export default router;