import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3 } from '../config/s3Storage';
import { AppError } from '../errors/app.error';

export const deleteFileFromS3 = async (fileUrl: string): Promise<void> => {
  try {
    // 1. URL에서 Key 추출
    const decodedUrl = decodeURIComponent(fileUrl);
    const bucketName = process.env.S3_BUCKET_NAME!;

    const fileKey = decodedUrl.split(
      `${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/`,
    )[1];
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
