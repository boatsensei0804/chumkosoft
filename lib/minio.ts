import "server-only";

import { Client } from "minio";

/**
 * MinIO (S3-compatible) object storage client — lazily constructed so env vars
 * are only required when storage is actually used. All access goes through the
 * helpers below; callers never touch the client directly.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }
  return value;
}

let client: Client | null = null;
let presignClient: Client | null = null;
let bucketReady: Promise<void> | null = null;

// Explicit region so the SDK never does a bucket-region discovery request. That
// lookup would otherwise hit the PRESIGN endpoint (localhost in Docker), which the
// app container can't reach — and it also keeps presigning fully offline.
const MINIO_REGION = process.env.MINIO_REGION ?? "us-east-1";

function getClient(): Client {
  if (!client) {
    client = new Client({
      endPoint: required("MINIO_ENDPOINT").replace(/^https?:\/\//, ""),
      port: Number(process.env.MINIO_PORT ?? 9000),
      useSSL: process.env.MINIO_USE_SSL === "true",
      region: MINIO_REGION,
      accessKey: required("MINIO_ROOT_USER"),
      secretKey: required("MINIO_ROOT_PASSWORD"),
    });
  }
  return client;
}

/**
 * A second client pointed at the PUBLIC endpoint, used only to sign browser URLs.
 * In Docker the app reaches MinIO at `minio:9000` (internal), but the browser can
 * only reach it at `localhost:9000` — a presigned URL must be signed for the host
 * the browser will hit, so its signature validates. Presigning is offline crypto,
 * so this client never actually connects. Falls back to the internal endpoint when
 * MINIO_PUBLIC_ENDPOINT is unset (local dev, where they are the same host).
 */
function getPresignClient(): Client {
  if (!presignClient) {
    const publicEndpoint = process.env.MINIO_PUBLIC_ENDPOINT ?? required("MINIO_ENDPOINT");
    presignClient = new Client({
      endPoint: publicEndpoint.replace(/^https?:\/\//, ""),
      port: Number(process.env.MINIO_PUBLIC_PORT ?? process.env.MINIO_PORT ?? 9000),
      useSSL: (process.env.MINIO_PUBLIC_USE_SSL ?? process.env.MINIO_USE_SSL) === "true",
      region: MINIO_REGION,
      accessKey: required("MINIO_ROOT_USER"),
      secretKey: required("MINIO_ROOT_PASSWORD"),
    });
  }
  return presignClient;
}

function getBucket(): string {
  return required("MINIO_BUCKET");
}

/** Creates the bucket on first use (idempotent, memoized per process). */
async function ensureBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      const minio = getClient();
      const bucket = getBucket();
      const exists = await minio.bucketExists(bucket);
      if (!exists) {
        await minio.makeBucket(bucket);
      }
    })();
  }
  return bucketReady;
}

/** Stores an object and returns its key. */
export async function putObject(key: string, data: Buffer, contentType: string): Promise<string> {
  await ensureBucket();
  await getClient().putObject(getBucket(), key, data, data.length, { "Content-Type": contentType });
  return key;
}

/** Short-lived signed URL for displaying a private object in the browser. */
export async function presignedGetUrl(key: string, expirySeconds = 3600): Promise<string> {
  await ensureBucket();
  return getPresignClient().presignedGetObject(getBucket(), key, expirySeconds);
}

/** Removes an object. Best-effort: a storage hiccup must not fail the caller. */
export async function removeObject(key: string): Promise<void> {
  try {
    await ensureBucket();
    await getClient().removeObject(getBucket(), key);
  } catch (error) {
    console.error("[minio] failed to remove object", key, error);
  }
}
