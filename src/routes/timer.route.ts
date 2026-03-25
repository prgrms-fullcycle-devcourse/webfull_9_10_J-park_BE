import { Router } from 'express';
import { authUser } from '../middlewares/auth.middleware';
import {
  endTimerController,
  runningTimerController,
  startTimerController,
} from '../controllers/timer.controller';

const router = Router();

router.get('/', authUser, runningTimerController);
router.post('/start', authUser, startTimerController);
router.post('/end', authUser, endTimerController);

export default router;
