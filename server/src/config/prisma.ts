import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../../generated/prisma/client.js";
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

console.log(path.resolve(process.cwd(), envFile))
const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string, {
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

