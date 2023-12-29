import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";

const databaseUrl = `postgres://${env.DB_USERNAME}:${env.DB_PASSWORD}@${env.DB_HOSTNAME}:${env.DB_PORT}/${env.DB_NAME}`;

export const prisma = new PrismaClient({
	datasourceUrl: databaseUrl,
});
