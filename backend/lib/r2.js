import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export const BUCKET = process.env.R2_BUCKET_NAME;

export async function getR2SignedUrl(r2Key, expiresIn = 1800) {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: r2Key,
    ResponseContentDisposition: 'inline',
    ResponseContentType: 'application/pdf',
  });
  return getSignedUrl(r2, cmd, { expiresIn });
}

// For images (club logos, faculty photos) — no forced PDF content type
export async function getImageSignedUrl(r2Key, expiresIn = 3600) {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: r2Key,
  });
  return getSignedUrl(r2, cmd, { expiresIn });
}

export async function uploadToR2(r2Key, buffer, contentType = 'application/pdf', cacheControl = null) {
  // Default cache control: 
  // - Images/PDFs: 1 year, immutable
  // - JSON/Other: 5 minutes (allows for faster updates)
  const defaultCacheControl = contentType === 'application/json' 
    ? 'public, max-age=300, must-revalidate' 
    : 'public, max-age=31536000, immutable';

  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: r2Key,
    Body: buffer,
    ContentType: contentType,
    Metadata: {
      'uploaded-at': new Date().toISOString(),
      'content-type': contentType,
    },
    CacheControl: cacheControl || defaultCacheControl,
    StorageClass: 'STANDARD',
  }));
}

export async function deleteFromR2(r2Key) {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: r2Key }));
}

// Get object content from R2 (for JSON data)
export async function getR2Object(r2Key) {
  try {
    const response = await r2.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: r2Key,
    }));
    
    // Convert stream to string
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf-8');
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      throw new Error(`Object not found: ${r2Key}`);
    }
    throw error;
  }
}
