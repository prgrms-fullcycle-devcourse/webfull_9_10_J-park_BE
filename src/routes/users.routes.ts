import { Router } from 'express';

import {
  finishKakaoLogin,
  getMe,
  startKakaoLogin,
  updateProfileImage,
  updateProfileNickname,
} from '../controllers/user.controller';
import { authUser } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.get('/me', authUser, getMe);

router.patch('/', authUser, updateProfileNickname);
router.patch('/profile', authUser, upload.single('image'), updateProfileImage);

// 카카오톡 OAuth 로그인
router.get('/kakao/start', authUser, startKakaoLogin);
router.get('/kakao/finish', authUser, finishKakaoLogin);

export default router;
