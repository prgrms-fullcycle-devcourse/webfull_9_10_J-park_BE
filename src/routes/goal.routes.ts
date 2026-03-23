import { Router } from 'express';
import {
  createGoalController,
  getGoalListController,
} from '../controllers/goal.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

/**
 * 목표 생성
 * POST /goals
 */
router.post('/', authMiddleware, createGoalController);

/**
 * 전체 목표 리스트 조회
 * GET /goals
 */
router.get('/', authMiddleware, getGoalListController);

export default router;