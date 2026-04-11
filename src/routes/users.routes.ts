import { Router } from 'express';

import {
  finishKakaoLogin,
  getMe,
  startKakaoLogin,
  updateProfileNickname,
} from '../controllers/user.controller';
import { authUser } from '../middlewares/auth.middleware';

const router = Router();

router.patch('/', authUser, updateProfileNickname);
router.get('/me', authUser, getMe);

// 카카오톡 OAuth 로그인
router.get('/kakao/start', authUser, startKakaoLogin);
router.get('/kakao/finish', authUser, finishKakaoLogin);

export default router;
