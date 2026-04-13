// Role: PostgreSQL connection pool configuration.
import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PGHOST ?? "127.0.0.1",
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? "gnu_DB",
  password: process.env.PGPASSWORD ?? "gnublank4898",
  database: process.env.PGDATABASE ?? "gnumatchclub",
});
