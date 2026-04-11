import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { s3 } from '../config/s3Storage';

export const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.S3_BUCKET_NAME as string,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (_, file, cb) => {
      const ext = path.extname(file.originalname); // 확장자
      const fileName = `profiles/${uuidv4()}${ext}`; // 파일명 설정
      cb(null, fileName);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 미만
});
