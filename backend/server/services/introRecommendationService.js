import { GoogleGenAI, Type } from "@google/genai";
import { pool } from "../db/pool.js";
import { getMeetings } from "./meetingService.js";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

let geminiClient = null;

export function getGeminiIntroModelName() {
  return process.env.GEMINI_INTRO_MODEL || DEFAULT_GEMINI_MODEL;
}

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

async function retryWithBackoff(fn, retries = 3, delay = 1500) {
  try {
    return await fn();
  } catch (error) {
    const status = error.status || error.statusCode;
    const isTemporaryError = status === 503 || status === 429 || 
                             (error.message && (error.message.includes("503") || error.message.includes("429")));

    if (retries > 0 && isTemporaryError) {
      console.warn(`⚠️ Gemini API Error (${status}). Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

const GEMINI_RECOMMEND_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    user_extracted_keywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    recommended_meetings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          meeting_id: { type: Type.STRING },
          title: { type: Type.STRING },
          tag_id: { type: Type.STRING },          
          display_category: { type: Type.STRING },  
          description: { type: Type.STRING },
          match_score: { type: Type.INTEGER },
          match_reason: { type: Type.STRING }
        },
        required: ["meeting_id", "title", "tag_id", "display_category", "description", "match_score", "match_reason"]
      }
    }
  },
  required: ["user_extracted_keywords", "recommended_meetings"]
};

export async function getIntroRecommendations({ introText, userId = null, limit }) {
  const client = getGeminiClient();
  if (!client) {
    throw createHttpError("Gemini API 클라이언트 초기화에 실패했습니다.", 500);
  }

  const meetings = await getMeetings();
  if (!meetings || meetings.length === 0) {
    return { keywords: ["AI 매칭"], recommendations: [] };
  }

  const prompt = `
    너는 대학생 소모임 추천 시스템의 매칭 분석 엔진이야.
    사용자의 자기소개 내용을 분석하고, 제공된 소모임 데이터 목록 중에서 의미상 가장 잘 매칭되는 상위 ${limit}개의 소모임을 골라줘.

    ★ 핵심 규칙: 단순 텍스트 일치(LIKE 연산)뿐만 아니라 '의미론적 유사성'을 파악해야 해.
    - 예: 사용자가 "게임" 또는 "롤 하고 싶다"라고 적으면, 본문에 '게임'이라는 단어가 직접 없더라도 '리그 오브 레전드', '오버워치', 'e스포츠', '보드게임' 소모임을 최우선 매칭해야 함.
    - 예: 사용자가 "코딩"이라고 적으면 '웹 개발', '알고리즘', '컴퓨터' 관련 모임을 매칭해야 함.

    ★ 카테고리 매핑 규칙 (display_category 필드에는 아래 명시된 ID 중 하나만 부여해줘):
    - [study, exercise, culture, game, religion, volunteer]

    ★ 정렬 규칙:
    - 매칭률이 가장 높은 모임부터 내림차순(match_score 순)으로 정렬해줘.

    [사용자 입력 내용 (자기소개)]
    "${introText}"

    [추천 대상 소모임 데이터 리스트]
    ${JSON.stringify(meetings.map(m => ({
      meeting_id: m.meeting_id || m.meetingId,
      title: m.title,
      tag_id: m.tag_id || m.tagId,
      description: m.description
    })), null, 2)}
  `;

  try {
    const response = await retryWithBackoff(() => 
      client.models.generateContent({
        model: getGeminiIntroModelName(),
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: GEMINI_RECOMMEND_SCHEMA,
          temperature: 0.2,
        },
      })
    );

    const rawText = response.text;
    if (!rawText) throw createHttpError("AI로부터 빈 응답을 받았습니다.", 502);

    const startIndex = rawText.indexOf("{");
    const endIndex = rawText.lastIndexOf("}");
    if (startIndex === -1 || endIndex === -1) {
      throw createHttpError("AI 응답 포맷이 유효한 JSON이 아닙니다.", 502);
    }

    const resultData = JSON.parse(rawText.slice(startIndex, endIndex + 1));

    return {
      keywords: (resultData.user_extracted_keywords || []).map(k => k.startsWith('#') ? k : `#${k}`),
      analysisSource: "gemini_context_matching",
      recommendations: (resultData.recommended_meetings || []).map(rm => {
        // 💡 DB에서 가져온 원본 모임 데이터 매칭
        const original = meetings.find(m => (m.meeting_id || m.meetingId) === rm.meeting_id) || {};
        
        return {
          meetingId: rm.meeting_id,
          title: rm.title,
          tagId: rm.tag_id,                  
          displayCategory: rm.display_category, 
          description: rm.description,
          matchScore: rm.match_score,
          matchReason: rm.match_reason,
          participantCount: original.participant_count || original.participantCount || original.member_count || 0,
          // 💡 [추가] DB 원본 데이터에서 장소 정보(location) 연동 (없으면 기본값 제공)
          location: original.location || original.activity_location || "장소 협의 예정"
        };
      })
    };

  } catch (error) {
    console.error("❌ 최종 의미 기반 AI 추천 파이프라인 실패:", error);
    throw createHttpError(error.message || "AI 추천 시스템 연산 중 오류가 발생했습니다.", 502);
  }
}