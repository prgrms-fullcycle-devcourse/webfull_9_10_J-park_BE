import { Router } from 'express';
import {
  createGoalController,
  getGoalListController,
  getGoalDetailController
} from '../controllers/goal.controller';
import { authUser } from '../middlewares/auth.middleware';

const router = Router();

/**
 * 목표 생성
 * POST /goals
 */
router.post('/', authUser, createGoalController);

/**
 * 전체 목표 리스트 조회
 * GET /goals
 */
router.get('/', authUser, getGoalListController);

/**
 * 개별 목표 상세 조회
 * /goals/{goalId}/detail: 
 * /goals/:goalId/detail?startDate=?&endDate=?
 */
router.get('/:goalId/detail', authUser, getGoalDetailController);

export default router;
