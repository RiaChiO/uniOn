import { requestJson } from "./http";

const MEETING_IMAGE_WIDTH = 1600;
const MEETING_IMAGE_HEIGHT = 900;
const MEETING_IMAGE_TYPE = "image/webp";
const MEETING_IMAGE_QUALITY = 0.9;

function getCroppedSourceRect(sourceWidth, sourceHeight, targetRatio) {
  const sourceRatio = sourceWidth / sourceHeight;

  if (sourceRatio > targetRatio) {
    const width = sourceHeight * targetRatio;
    return {
      x: (sourceWidth - width) / 2,
      y: 0,
      width,
      height: sourceHeight,
    };
  }

  const height = sourceWidth / targetRatio;
  return {
    x: 0,
    y: (sourceHeight - height) / 2,
    width: sourceWidth,
    height,
  };
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 불러오지 못했습니다."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("이미지 비율 조정에 실패했습니다."));
      },
      type,
      quality
    );
  });
}

async function resizeMeetingImage(file) {
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("이미지 비율 조정을 지원하지 않는 브라우저입니다.");
  }

  canvas.width = MEETING_IMAGE_WIDTH;
  canvas.height = MEETING_IMAGE_HEIGHT;

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const source = getCroppedSourceRect(
    sourceWidth,
    sourceHeight,
    MEETING_IMAGE_WIDTH / MEETING_IMAGE_HEIGHT
  );

  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    image,
    source.x,
    source.y,
    source.width,
    source.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const blob = await canvasToBlob(
    canvas,
    MEETING_IMAGE_TYPE,
    MEETING_IMAGE_QUALITY
  );
  const baseName = file.name.replace(/\.[^.]+$/, "") || "meeting-image";

  return new File([blob], `${baseName}-16x9.webp`, {
    type: MEETING_IMAGE_TYPE,
    lastModified: Date.now(),
  });
}

export async function uploadMeetingImage(file) {
  if (!file) return null;

  const uploadFile = await resizeMeetingImage(file);
  const uploadSignature = await requestJson(
    "/api/uploads/meeting-image-signature",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contentType: uploadFile.type,
        size: uploadFile.size,
      }),
    },
    "이미지 업로드 서명을 발급받지 못했습니다."
  );

  const formData = new FormData();
  formData.append("file", uploadFile);
  formData.append("api_key", uploadSignature.apiKey);
  formData.append("timestamp", uploadSignature.timestamp);
  formData.append("signature", uploadSignature.signature);
  formData.append("folder", uploadSignature.folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${uploadSignature.cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error("이미지 업로드에 실패했습니다.");
  }

  const data = await response.json();
  return data.secure_url;
}
