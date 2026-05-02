import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../../generated/prisma/client";
import dotenv from "dotenv";
import path from "path";
import setupServer from "../setup";

const envFile =
  process.env.NODE_ENV === "production" ? ".env.prod" : ".env.dev";

dotenv.config({
  path: path.resolve(process.cwd(), envFile),
  debug: false,
  quiet: true,
});

const adapter = new PrismaMariaDb({
  connectionLimit: 5,
  database: process.env.DATABASE_NAME,
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
});

(async () => {
  try {
    await adapter.connect();
    console.log("[PRISMA] Connected to MariaDB successfully");
    await setupServer();
  } catch (err) {
    console.error("[PRISMA] Connection failed:", (err as Error).message);
    process.exit(1);
  }
})();

const prisma = new PrismaClient({
  adapter,
});

export default prisma;

