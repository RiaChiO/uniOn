export async function requestJson(url, options = {}, fallbackMessage = "요청 처리에 실패했습니다.") {
  const res = await fetch(url, options);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || fallbackMessage);
  }

  return data;
}
