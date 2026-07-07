"use client";

/**
 * Browser-side face utilities shared by the dataset uploader (and later the
 * scan kiosk). face-api.js is loaded lazily on first use — it bundles TF.js and
 * is several MB, so it must never be in the initial chunk. The same models are
 * used at enrollment and at the kiosk so descriptors are comparable.
 */

type FaceApi = typeof import("@vladmandic/face-api");

const MODEL_URI = "/models/face";
const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.85;

let faceApiPromise: Promise<FaceApi> | null = null;

/** Loads face-api.js + the detector/landmark/recognition models (memoized). */
export function loadFaceApi(): Promise<FaceApi> {
  if (!faceApiPromise) {
    faceApiPromise = (async () => {
      const faceapi = await import("@vladmandic/face-api");
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URI),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URI),
      ]);
      return faceapi;
    })();
  }
  return faceApiPromise;
}

export type DetectOutcome =
  | { ok: true; descriptor: number[] }
  | { ok: false; reason: "no-face" | "error" };

/** Detects a single face in an image or video element and returns its descriptor. */
export async function detectDescriptor(input: HTMLImageElement | HTMLVideoElement): Promise<DetectOutcome> {
  try {
    const faceapi = await loadFaceApi();
    const detection = await faceapi
      .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!detection) {
      return { ok: false, reason: "no-face" };
    }
    return { ok: true, descriptor: Array.from(detection.descriptor) };
  } catch {
    return { ok: false, reason: "error" };
  }
}

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ScanDetectOutcome =
  | { ok: true; descriptor: number[]; box: FaceBox }
  | { ok: false; reason: "no-face" | "error" };

/** Like detectDescriptor but also returns the face box, for kiosk liveness checks. */
export async function detectFaceForScan(input: HTMLVideoElement): Promise<ScanDetectOutcome> {
  try {
    const faceapi = await loadFaceApi();
    const detection = await faceapi
      .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!detection) {
      return { ok: false, reason: "no-face" };
    }
    const { x, y, width, height } = detection.detection.box;
    return { ok: true, descriptor: Array.from(detection.descriptor), box: { x, y, width, height } };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** Loads a File into an HTMLImageElement (object URL is revoked by the caller flow). */
export function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("ไม่สามารถอ่านไฟล์รูปได้"));
    };
    img.src = url;
  });
}

/** Captures the current webcam frame as a downscaled (≤1024px) JPEG. */
export function captureVideoJpeg(video: HTMLVideoElement, maxDimension = MAX_DIMENSION, quality = JPEG_QUALITY): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) {
      reject(new Error("กล้องยังไม่พร้อม"));
      return;
    }
    const scale = Math.min(1, maxDimension / Math.max(vw, vh));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(vw * scale);
    canvas.height = Math.round(vh * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("เบราว์เซอร์ไม่รองรับการถ่ายภาพ"));
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("ถ่ายภาพไม่สำเร็จ"))), "image/jpeg", quality);
  });
}

/** Downscales to ≤1024px JPEG so uploads stay small and consistent. */
export function resizeToJpeg(image: HTMLImageElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("เบราว์เซอร์ไม่รองรับการย่อรูป"));
      return;
    }
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("ย่อรูปไม่สำเร็จ"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}
