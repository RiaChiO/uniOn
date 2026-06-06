// Role: load local environment variables before services read process.env.
import path from "path";
import dotenv from "dotenv";

const envPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "backend", ".env"),
];

for (const envPath of envPaths) {
  dotenv.config({ path: envPath, override: false, quiet: true });
}
