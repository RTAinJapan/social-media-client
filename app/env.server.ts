import { z } from "zod";

const envSchema = z.object({
	DISCORD_CLIENT_ID: z.string(),
	DISCORD_CLIENT_SECRET: z.string(),

	NODE_ENV: z.enum(["development", "production"]).default("development"),

	SERVER_ORIGIN: z.string(),

	DISCORD_SERVER_ID: z.string(),
	DISCORD_VALID_ROLE_IDS: z.string(),

	TWITTER_USERNAME: z.string().optional(),
	TWITTER_PASSWORD: z.string().optional(),
	TWITTER_USER_EMAIL: z.string().optional(),
	PUPPETEER_HEADLESS: z.coerce.boolean().default(false),
	PUPPETEER_SCREENSHOT_PATH: z.string().optional(),

	BLUESKY_USERNAME: z.string().optional(),
	BLUESKY_PASSWORD: z.string().optional(),

	RUNDATA_API_URL: z.string().optional(),
});

export const env = envSchema.parse(process.env);
