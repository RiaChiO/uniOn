import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { recommend } from "./recommendation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(backendRoot, "..");
const dataDir = path.join(backendRoot, "data");

const users = JSON.parse(fs.readFileSync(path.join(dataDir, "users.json")));
const meetings = JSON.parse(fs.readFileSync(path.join(dataDir, "meetings.json")));

const outputDir = path.join(projectRoot, "frontend", "public", "data");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

for (const userId in users) {
  const user = users[userId];
  const result = recommend(user, meetings, users);

  console.log(`\n[${userId}] TOP 3`);
  console.log(result.slice(0, 3));

  fs.writeFileSync(`${outputDir}/${userId}.json`, JSON.stringify(result, null, 2));
}

console.log("\n모든 유저 추천 결과 저장 완료");
