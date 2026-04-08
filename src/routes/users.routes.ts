import { Router } from 'express';

import {
  finishKakaoLogin,
  getMe,
  startKakaoLogin,
  updateProfile,
} from '../controllers/user.controller';
import { authUser } from '../middlewares/auth.middleware';

const router = Router();

router.route('/').patch(authUser, updateProfile);
router.get('/me', authUser, getMe);

// 카카오톡 OAuth 로그인
router.get('/kakao/start', authUser, startKakaoLogin);
router.get('/kakao/finish', authUser, finishKakaoLogin);

export default router;
