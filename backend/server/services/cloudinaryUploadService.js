// Role: create short-lived Cloudinary upload signatures without exposing secrets.
import crypto from "crypto";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DEFAULT_UPLOAD_FOLDER = "union/meeting-images";

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const uploadFolder = process.env.CLOUDINARY_UPLOAD_FOLDER || DEFAULT_UPLOAD_FOLDER;

  if (!cloudName || !apiKey || !apiSecret) {
    throw createHttpError("Cloudinary 업로드 환경변수가 설정되지 않았습니다.", 503);
  }

  return {
    apiKey,
    apiSecret,
    cloudName,
    uploadFolder,
  };
}

function signUploadParams(params, apiSecret) {
  const payload = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto.createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

export function createMeetingImageUploadSignature({ contentType, size }) {
  const normalizedContentType = String(contentType ?? "").trim().toLowerCase();
  const numericSize = Number(size);

  if (!ALLOWED_IMAGE_TYPES.has(normalizedContentType)) {
    throw createHttpError("jpg, png, webp 이미지만 업로드할 수 있습니다.", 400);
  }

  if (!Number.isFinite(numericSize) || numericSize <= 0 || numericSize > MAX_IMAGE_BYTES) {
    throw createHttpError("이미지는 5MB 이하로 업로드하세요.", 400);
  }

  const config = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const uploadParams = {
    folder: config.uploadFolder,
    timestamp,
  };

  return {
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    folder: config.uploadFolder,
    timestamp,
    signature: signUploadParams(uploadParams, config.apiSecret),
  };
}
