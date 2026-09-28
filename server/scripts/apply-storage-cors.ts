// Applies the CORS rules the browser needs for presigned uploads/downloads
// to the S3 / R2 bucket.  Run: npm run storage:cors   (reads server/.env)
import "dotenv/config";
import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";
import { allowedOrigins } from "../src/lib/security.js";
import { storageEnabled } from "../src/lib/storage.js";

if (!storageEnabled) {
  console.error("S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be set in server/.env");
  process.exit(1);
}

const origins = allowedOrigins();
const s3 = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: !!process.env.S3_ENDPOINT,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
});
const Bucket = process.env.S3_BUCKET!;

await s3.send(
  new PutBucketCorsCommand({
    Bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: origins,
          AllowedMethods: ["GET", "PUT", "HEAD"],
          AllowedHeaders: ["content-type"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
);
const check = await s3.send(new GetBucketCorsCommand({ Bucket }));
console.log(`CORS applied to bucket "${Bucket}" for:\n  ${origins.join("\n  ")}`);
console.log(JSON.stringify(check.CORSRules, null, 2));
