import { Router } from 'express';
import {
  createGoalController,
  getGoalListController,
  getTodayGoalsController,
  getTodayGoalCompletionController,
  getGoalDetailController,
  updateGoalController,
  deleteGoalController
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
 * 데일리 목표 리스트 조회
 * GET /goals/today
 */
router.get('/today', authUser, getTodayGoalsController);

/**
 * 오늘 목표 달성률 조회
 * GET /goals/today/complete
 */
router.get('/today/complete', authUser, getTodayGoalCompletionController);

/**
 * 개별 목표 상세 조회
 * /goals/{goalId}/detail: 
 * /goals/:goalId/detail?startDate=?&endDate=?
 */
router.get('/:goalId/detail', authUser, getGoalDetailController);

/**
 * 개별 목표 수정 
 * PATCH /goals/{goalId}
 */
router.patch('/:goalId', authUser, updateGoalController);

/**
 * 목표 삭제
 * DELETE /goals/{goalId}
 */
router.delete('/:goalId', authUser, deleteGoalController);


export default router;
