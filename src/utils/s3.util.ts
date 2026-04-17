import { DeleteObjectCommand } from '@aws-sdk/client-s3';

import { s3 } from '../config/s3Storage';
import { AppError } from '../errors/app.error';

export const toCDNUrl = (fileKey: string | null): string | null => {
  if (!fileKey) return null;
  return `${process.env.CDN_DOMAIN!}/${fileKey}`;
};

export const deleteFileFromS3 = async (fileKey: string): Promise<void> => {
  try {
    const bucketName = process.env.S3_BUCKET_NAME!;
    if (!fileKey) {
      throw new AppError('S3_SERVER_ERROR');
    }

    // 2. 삭제 명령 요청
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    });
    await s3.send(deleteCommand);
  } catch (err) {
    console.error(`S3 Image Deletion Err: ${err}`);
    throw new AppError('S3_SERVER_ERROR');
  }
};
