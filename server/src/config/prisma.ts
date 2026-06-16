import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "@prisma/client";

import dotenv from "dotenv";
import path from "path";
import setupServer from "../setup.js";

const envFile =
  process.env.NODE_ENV === "production" ? "../.env.prod" : "../.env.dev";

dotenv.config({
  path: path.resolve(process.cwd(), envFile),
  debug: false,
  quiet: true,
});

console.log(process.env.DATABASE_URL!)
const url = new URL(process.env.DATABASE_URL!);

const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
});

(async () => {
  try {
    await adapter.connect();
    await setupServer();
  } catch (err) {
    console.error("[PRISMA] Connection failed:", (err as Error).message);
    process.exit(1);
  }

  console.log("[PRISMA] Connected to MariaDB successfully");
})();

const prisma = new PrismaClient({
  adapter,
});

export default prisma;
