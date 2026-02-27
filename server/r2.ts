import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import path from "path";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME || "ctrxl48";
const r2PublicUrl = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.warn("[R2] Cloudflare R2 credentials not configured. Uploads will fail.");
}

let s3Client: S3Client | null = null;

function getClient(): S3Client {
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Konfigurasi Cloudflare R2 belum lengkap. Pastikan R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, dan R2_SECRET_ACCESS_KEY sudah diatur.");
  }
  if (!s3Client) {
    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return s3Client;
}

export async function uploadToR2(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<string> {
  const client = getClient();
  const ext = path.extname(originalName);
  const key = `uploads/${crypto.randomBytes(16).toString("hex")}${ext}`;

  console.log(`[R2 Debug] bucket="${bucketName}", endpoint="https://${accountId}.r2.cloudflarestorage.com", key="${key}"`);

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
      })
    );
  } catch (err: any) {
    console.error(`[R2 Upload Failed] bucket="${bucketName}", error="${err.message}"`);
    throw err;
  }

  if (!r2PublicUrl) {
    throw new Error("R2_PUBLIC_URL belum diatur. Set ke URL public bucket R2 Anda.");
  }
  return `${r2PublicUrl}/${key}`;
}
