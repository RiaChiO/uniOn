import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const TAGS = ["study", "exercise", "culture", "game", "religion", "volunteer"];
const MEETING_TYPES = ["club", "small-group", "one-time"];
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const dataDir = path.join(backendRoot, "data");

// 🔹 랜덤 벡터 생성
function randomVector() {
  let obj = {};
  TAGS.forEach(tag => {
    obj[tag] = Math.floor(Math.random() * 10);
  });
  return obj;
}

// 🔹 사용자 생성
function generateUsers(count = 100) {
  let users = {};

  for (let i = 1; i <= count; i++) {
    users[`user${i}`] = {
      name: `User${i}`,
      email: `user${i}@test.com`,
      interestVector: randomVector(),
      createdAt: new Date().toISOString()
    };
  }

  return users;
}

// 🔹 랜덤 유저 선택 (중복 없음)
function getRandomUsers(users, count) {
  const userIds = Object.keys(users);
  const shuffled = [...userIds].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// 🔹 모임 생성 (참여자 포함, 최소 3명)
function generateMeetings(count = 50, users) {
  let meetings = {};

  for (let i = 1; i <= count; i++) {
    const tag = TAGS[Math.floor(Math.random() * TAGS.length)];
    const meetingType = MEETING_TYPES[Math.floor(Math.random() * MEETING_TYPES.length)];

    // ✅ 최소 3명 보장
    const participantCount = 3 + Math.floor(Math.random() * 5);

    const participants = getRandomUsers(users, participantCount);

    meetings[`meeting${i}`] = {
      title: `모임 ${i}`,
      meetingType,
      tagId: tag,
      description: `${tag} 관련 활동`,
      hostUserId: participants[0],
      participants: participants, // 🔥 핵심 추가
      createdAt: new Date().toISOString()
    };
  }

  return meetings;
}

// 🔥 실행 부분
const users = generateUsers(100);
const meetings = generateMeetings(50, users);

// 🔹 파일 저장
fs.writeFileSync(path.join(dataDir, "users.json"), JSON.stringify(users, null, 2));
fs.writeFileSync(path.join(dataDir, "meetings.json"), JSON.stringify(meetings, null, 2));

console.log("데이터 생성 완료 🚀");
