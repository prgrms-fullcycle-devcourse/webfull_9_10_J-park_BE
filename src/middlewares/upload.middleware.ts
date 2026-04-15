import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { AppError } from '../errors/app.error';

import { s3 } from '../config/s3Storage';

const upload = multer({
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
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = ['.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();

    // 확장자 검사
    const isAllowedExt = allowedExtensions.includes(ext);
    const isAllowedMime = file.mimetype.startsWith('image/');

    if (isAllowedExt && isAllowedMime) {
      cb(null, true);
    } else {
      cb(new AppError('INVALID_FILE_EXT'));
    }
  },
});

export const uploadImage = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  upload.single('image')(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('FILE_TOO_LARGE'));
      }

      if (err instanceof AppError) {
        return next(err);
      }

      return next(new AppError('UPLOAD_ERROR'));
    }

    // if (!req.file) {
    //   return next(new AppError('MISSING_FILE'));
    // }

    next();
  });
};
