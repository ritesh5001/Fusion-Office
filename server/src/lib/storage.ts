import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * S3-compatible object storage (AWS S3 or Cloudflare R2).
 * Browsers upload/download source files directly with presigned URLs, so
 * large PDFs never pass through the API (and its body-size limits).
 */
export const storageEnabled =
  !!process.env.S3_BUCKET && !!process.env.S3_ACCESS_KEY_ID && !!process.env.S3_SECRET_ACCESS_KEY;

let client: S3Client | null = null;
function s3() {
  if (!client) {
    client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: !!process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

const Bucket = () => process.env.S3_BUCKET!;

export const sourceKey = (userId: string, documentId: string, sourceId: string) =>
  `users/${userId}/documents/${documentId}/sources/${sourceId}.pdf`;

export function presignUpload(key: string, contentType = "application/pdf") {
  return getSignedUrl(s3(), new PutObjectCommand({ Bucket: Bucket(), Key: key, ContentType: contentType }), { expiresIn: 900 });
}

export function presignDownload(key: string) {
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: Bucket(), Key: key }), { expiresIn: 900 });
}

export async function deleteObject(key: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: Bucket(), Key: key }));
}
