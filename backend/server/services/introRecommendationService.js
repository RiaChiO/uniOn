// Role: recommend meetings from free-form intro text; Gemini can replace local analysis.
import { GoogleGenAI, Type } from "@google/genai";
import { pool } from "../db/pool.js";
import { getMeetings } from "./meetingService.js";

const MAX_INTRO_LENGTH = 1000;
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 20;
const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_ANALYSIS_INSTRUCTIONS = [
  "Return ONLY valid JSON. No markdown. No explanation.",
  'Schema: {"keywords":[string],"tagIds":[string],"displayCategories":[string]}.',
  "tagIds must only contain: study, exercise, culture, game, religion, volunteer.",
  "displayCategories should use concise ids such as academic, it, sports, music, art, photo, networking, language, startup, culture, game, religion, volunteer.",
];
const GEMINI_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    keywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    tagIds: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        enum: ["study", "exercise", "culture", "game", "religion", "volunteer"],
      },
    },
    displayCategories: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["keywords", "tagIds", "displayCategories"],
  propertyOrdering: ["keywords", "tagIds", "displayCategories"],
};

const CATEGORY_RULES = [
  {
    tagId: "game",
    displayCategory: "game",
    keywords: ["게임", "롤", "리그오브레전드", "보드게임", "내전", "e스포츠", "온라인"],
  },
  {
    tagId: "study",
    displayCategory: "it",
    keywords: ["개발", "코딩", "프로그래밍", "알고리즘", "웹", "앱", "데이터", "ai", "인공지능", "해커톤"],
  },
  {
    tagId: "study",
    displayCategory: "academic",
    keywords: ["공부", "스터디", "학습", "자격증", "시험", "전공", "학술", "교육"],
  },
  {
    tagId: "exercise",
    displayCategory: "sports",
    keywords: ["운동", "스포츠", "러닝", "축구", "농구", "헬스", "요가", "등산", "탁구", "배드민턴"],
  },
  {
    tagId: "culture",
    displayCategory: "music",
    keywords: ["음악", "공연", "밴드", "보컬", "기타", "댄스", "연극", "합창", "무대"],
  },
  {
    tagId: "culture",
    displayCategory: "art",
    keywords: ["그림", "미술", "공예", "디자인", "드로잉", "창작", "예술"],
  },
  {
    tagId: "culture",
    displayCategory: "photo",
    keywords: ["사진", "영상", "카메라", "촬영", "편집", "필름"],
  },
  {
    tagId: "culture",
    displayCategory: "networking",
    keywords: ["친목", "교류", "네트워킹", "발표", "토론", "커뮤니티", "사람"],
  },
  {
    tagId: "study",
    displayCategory: "language",
    keywords: ["영어", "일본어", "중국어", "언어", "회화", "국제", "외국어"],
  },
  {
    tagId: "volunteer",
    displayCategory: "volunteer",
    keywords: ["봉사", "나눔", "사회", "환경", "플로깅", "지역"],
  },
  {
    tagId: "religion",
    displayCategory: "religion",
    keywords: ["종교", "기독", "불교", "가톨릭", "성경", "기도", "선교"],
  },
];

const TAG_VECTOR_INDEX = {
  study: 0,
  exercise: 1,
  culture: 2,
  game: 3,
  religion: 4,
  volunteer: 5,
};
const EMPTY_TAG_VECTOR = [0, 0, 0, 0, 0, 0];
let geminiClient = null;

export function getGeminiIntroModelName() {
  return process.env.GEMINI_INTRO_MODEL || DEFAULT_GEMINI_MODEL;
}

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeKeyword(keyword) {
  return String(keyword ?? "")
    .replace(/^#/, "")
    .trim()
    .toLowerCase();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeAnalysis(analysis) {
  return {
    keywords: unique((analysis.keywords ?? []).map(normalizeKeyword)).slice(0, 12),
    tagIds: unique(
      (analysis.tagIds ?? []).map(normalizeKeyword).filter((tagId) => TAG_VECTOR_INDEX[tagId] != null)
    ),
    displayCategories: unique((analysis.displayCategories ?? []).map(normalizeKeyword)).slice(0, 8),
  };
}

function extractGeminiResponseText(response) {
  return typeof response.text === "string" ? response.text : "";
}

function parseJsonObject(text) {
  const trimmed = String(text ?? "")
    .replace(/```json|```/gi, "")
    .trim();
  const startIndex = trimmed.indexOf("{");
  const endIndex = trimmed.lastIndexOf("}");

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw createHttpError("Gemini 응답을 JSON으로 해석할 수 없습니다.", 502);
  }

  const jsonText = trimmed.slice(startIndex, endIndex + 1);

  return JSON.parse(jsonText);
}

function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) return null;

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  return geminiClient;
}

function buildGeminiPrompt(introText) {
  return [
    ...GEMINI_ANALYSIS_INSTRUCTIONS,
    `Analyze this intro text for club recommendation:\n${introText}`,
  ].join(" ");
}

async function analyzeIntroTextWithGemini(introText) {
  const client = getGeminiClient();
  if (!client) return null;

  const model = getGeminiIntroModelName();
  try {
    const response = await client.models.generateContent({
      model,
      contents: buildGeminiPrompt(introText),
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: GEMINI_RESPONSE_SCHEMA,
        maxOutputTokens: 800,
        temperature: 0.1,
      },
    });

    return normalizeAnalysis(parseJsonObject(extractGeminiResponseText(response)));
  } catch (error) {
    throw createHttpError(error.message || "Gemini 분석 요청에 실패했습니다.", 502);
  }
}

function analyzeIntroTextLocally(introText) {
  const normalizedText = introText.toLowerCase();
  const matchedKeywords = [];
  const tagIds = [];
  const displayCategories = [];

  for (const rule of CATEGORY_RULES) {
    const matches = rule.keywords.filter((keyword) =>
      normalizedText.includes(keyword.toLowerCase())
    );

    if (matches.length > 0) {
      matchedKeywords.push(...matches);
      tagIds.push(rule.tagId);
      displayCategories.push(rule.displayCategory);
    }
  }

  const fallbackKeywords = normalizedText
    .split(/[\s,.;:!?()[\]{}"'`~|\\/]+/)
    .map(normalizeKeyword)
    .filter((word) => word.length >= 2)
    .slice(0, 8);

  return {
    keywords: unique(matchedKeywords.length ? matchedKeywords : fallbackKeywords),
    tagIds: unique(tagIds),
    displayCategories: unique(displayCategories),
  };
}

export async function analyzeIntroText(introText) {
  const geminiAnalysis = await analyzeIntroTextWithGemini(introText);
  if (geminiAnalysis) return { ...geminiAnalysis, source: "gemini" };

  return { ...analyzeIntroTextLocally(introText), source: "local" };
}

async function getUserVector(userId) {
  if (!userId) return null;

  const result = await pool.query(
    `
    SELECT study, exercise, culture, game, religion, volunteer
    FROM user_interest_vectors
    WHERE user_id = $1
    `,
    [userId]
  );

  if (result.rowCount === 0) return null;

  const row = result.rows[0];
  return [
    Number(row.study) || 0,
    Number(row.exercise) || 0,
    Number(row.culture) || 0,
    Number(row.game) || 0,
    Number(row.religion) || 0,
    Number(row.volunteer) || 0,
  ];
}

function cosineSimilarity(left, right) {
  if (!left || !right) return 0;

  const dot = left.reduce((sum, value, index) => sum + value * Number(right[index] ?? 0), 0);
  const leftMagnitude = Math.sqrt(left.reduce((sum, value) => sum + value ** 2, 0));
  const rightMagnitude = Math.sqrt(
    right.reduce((sum, value) => sum + Number(value ?? 0) ** 2, 0)
  );

  return leftMagnitude && rightMagnitude ? dot / (leftMagnitude * rightMagnitude) : 0;
}

function getMeetingTagVector(tagId) {
  const tagVector = [...EMPTY_TAG_VECTOR];
  const tagVectorIndex = TAG_VECTOR_INDEX[tagId];
  if (tagVectorIndex != null) tagVector[tagVectorIndex] = 10;
  return tagVector;
}

function scoreMeeting(meeting, analysis, userVector) {
  const normalizedKeywords = analysis.keywords.map(normalizeKeyword);
  const normalizedTags = (meeting.tags ?? []).map(normalizeKeyword);
  const searchableText = [
    meeting.title,
    meeting.description,
    meeting.tagId,
    meeting.displayCategory,
    ...normalizedTags,
  ]
    .join(" ")
    .toLowerCase();

  const matchedKeywords = normalizedKeywords.filter((keyword) =>
    searchableText.includes(keyword)
  );
  const tagMatch = analysis.tagIds.includes(meeting.tagId) ? 1 : 0;
  const categoryMatch = analysis.displayCategories.includes(meeting.displayCategory) ? 1 : 0;
  const tagVector = getMeetingTagVector(meeting.tagId);

  const userVectorScore = userVector
    ? cosineSimilarity(userVector, meeting.avg_participant_vector ?? tagVector)
    : 0;
  const recruitingBoost = meeting.isRecruiting ? 5 : 0;
  const keywordScore = matchedKeywords.length * 20;
  const categoryScore = tagMatch * 30 + categoryMatch * 15;
  const vectorScore = Math.round(userVectorScore * 20);
  const matchScore = Math.min(100, keywordScore + categoryScore + vectorScore + recruitingBoost);

  return {
    meeting,
    matchedKeywords,
    matchCount: matchedKeywords.length,
    matchScore,
    matchReason: matchedKeywords.length
      ? `${matchedKeywords.join(", ")} 키워드가 모임 정보와 일치합니다.`
      : "자기소개서의 관심 분야와 모임 대분류가 유사합니다.",
  };
}

function normalizeLimit(limit) {
  return Math.min(MAX_LIMIT, Math.max(1, Number(limit) || DEFAULT_LIMIT));
}

export async function getIntroRecommendations({
  introText,
  userId = null,
  limit = DEFAULT_LIMIT,
}) {
  const normalizedIntroText = String(introText ?? "").trim();

  if (!normalizedIntroText) {
    throw createHttpError("introText는 필수입니다.", 400);
  }

  if (normalizedIntroText.length > MAX_INTRO_LENGTH) {
    throw createHttpError(`introText는 ${MAX_INTRO_LENGTH}자 이하로 입력하세요.`, 400);
  }

  const safeLimit = normalizeLimit(limit);
  const [analysis, userVector, meetings] = await Promise.all([
    analyzeIntroText(normalizedIntroText),
    getUserVector(userId),
    getMeetings(),
  ]);

  const scoredMeetings = meetings
    .map((meeting) => scoreMeeting(meeting, analysis, userVector))
    .filter((item) => item.matchScore > 0)
    .sort((left, right) => {
      if (right.matchScore !== left.matchScore) return right.matchScore - left.matchScore;
      return Number(right.meeting.participantCount ?? 0) - Number(left.meeting.participantCount ?? 0);
    })
    .slice(0, safeLimit)
    .map(({ meeting, matchedKeywords, matchCount, matchScore, matchReason }) => ({
      ...meeting,
      matchedKeywords,
      matchCount,
      matchScore,
      matchReason,
    }));

  return {
    keywords: analysis.keywords.map((keyword) => `#${keyword}`),
    tagIds: analysis.tagIds,
    displayCategories: analysis.displayCategories,
    analysisSource: analysis.source,
    recommendations: scoredMeetings,
  };
}
