import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export const BUCKET = process.env.R2_BUCKET_NAME;

export async function getR2SignedUrl(r2Key, expiresIn = 300) {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: r2Key });
  return getSignedUrl(r2, cmd, { expiresIn });
}

export async function uploadToR2(buffer, r2Key, contentType = 'application/pdf') {
  await r2.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         r2Key,
    Body:        buffer,
    ContentType: contentType,
  }));
}

export async function deleteFromR2(r2Key) {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: r2Key }));
}
