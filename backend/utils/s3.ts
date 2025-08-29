import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  // creds come from env; Vercel injects automatically when set
});

type PresignArgs = {
  bucket: string;
  key: string;
  contentType: string;
  expiresIn?: number; // seconds
};

export async function presignPutUrl({
  bucket,
  key,
  contentType,
  expiresIn = 60,
}: PresignArgs) {
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    // ACL: "public-read", // only if your bucket requires per-object ACLs
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn });
  return url;
}
