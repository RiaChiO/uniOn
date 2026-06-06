import { requestJson } from "./http";

export async function uploadMeetingImage(file) {
  if (!file) return null;

  const uploadSignature = await requestJson(
    "/api/uploads/meeting-image-signature",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contentType: file.type,
        size: file.size,
      }),
    },
    "이미지 업로드 서명을 발급받지 못했습니다."
  );

  const formData = new FormData();
  formData.append("file", file);
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
