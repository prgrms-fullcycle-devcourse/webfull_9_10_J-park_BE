import { Router } from 'express';

import {
  finishKakaoLogin,
  getMe,
  startKakaoLogin,
  updateProfile,
} from '../controllers/user.controller';
import { authUser } from '../middlewares/auth.middleware';
import { uploadImage } from '../middlewares/upload.middleware';

const router = Router();

router.get('/me', authUser, getMe);

router.patch('/profile', authUser, uploadImage, updateProfile);

// 카카오톡 OAuth 로그인
router.get('/kakao/start', authUser, startKakaoLogin);
router.get('/kakao/finish', authUser, finishKakaoLogin);

export default router;
