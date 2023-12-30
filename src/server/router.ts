import { randomBytes } from "crypto";
import { env } from "./env.js";
import { authorizedProcedure, publicProcedure, router } from "./trpc.js";
import {
	DISCORD_OAUTH_STATE_COOKIE_NAME,
	SESSION_COOKIE_NAME,
} from "./constant.js";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { prisma } from "./prisma.js";
import ky from "ky";
import { tweet } from "./puppeteer.js";
import * as path from "node:path";
import { tmpdir } from "./tmpdir.js";

const discordClientId = env.DISCORD_CLIENT_ID;
const discordClientSecret = env.DISCORD_CLIENT_SECRET;

const discordOauthRedirectUrl = new URL("/validate-oauth", env.CLIENT_ORIGIN);

const authorizationRouter = router({
	initialize: publicProcedure.query(({ ctx }) => {
		const state = randomBytes(100).toString("base64url");
		ctx.res.setCookie(DISCORD_OAUTH_STATE_COOKIE_NAME, state, {
			httpOnly: true,
			sameSite: "strict",
			maxAge: 10 * 60, // 10 minutes
			secure: env.NODE_ENV === "production",
		});

		const oauthUrl = new URL("https://discord.com/oauth2/authorize");
		oauthUrl.searchParams.append("response_type", "code");
		oauthUrl.searchParams.append("client_id", discordClientId);
		oauthUrl.searchParams.append("scope", "identify guilds.members.read");
		oauthUrl.searchParams.append("state", state);
		oauthUrl.searchParams.append("redirect_uri", discordOauthRedirectUrl.href);

		return {
			oauthUrl: oauthUrl.href,
		};
	}),

	validate: publicProcedure
		.input(z.object({ code: z.string(), state: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const state = ctx.req.cookies[DISCORD_OAUTH_STATE_COOKIE_NAME];
			if (input.state !== state) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "mismatch state" });
			}

			const authorization = Buffer.from(
				discordClientId + ":" + discordClientSecret
			).toString("base64");
			const token = await ky
				.post(`https://discord.com/api/v10/oauth2/token`, {
					body: new URLSearchParams({
						grant_type: "authorization_code",
						code: input.code,
						redirect_uri: discordOauthRedirectUrl.href,
					}),
					headers: {
						authorization: `Basic ${authorization}`,
					},
				})
				.json<{
					access_token: string;
					token_type: string;
					expires_in: number;
					refresh_token: string;
					scope: string;
				}>();

			const user = await ky
				.get("https://discord.com/api/users/@me", {
					headers: {
						authorization: `${token.token_type} ${token.access_token}`,
					},
				})
				.json<{ id: string; username: string; discriminator: string }>();

			await prisma.user.upsert({
				create: {
					discordId: user.id,
					discordUsername: user.username,
					discordDiscriminator: user.discriminator,
				},
				update: {
					discordUsername: user.username,
					discordDiscriminator: user.discriminator,
				},
				where: {
					discordId: user.id,
				},
			});

			const userGuild = await ky
				.get(
					`https://discord.com/api/users/@me/guilds/${env.DISCORD_SERVER_ID}/member`,
					{
						headers: {
							authorization: `${token.token_type} ${token.access_token}`,
						},
					}
				)
				.json<{ roles: string[] }>();
			const validRoleIds = env.DISCORD_VALID_ROLE_IDS.split(",");
			const validUser = userGuild.roles.some((role) =>
				validRoleIds.includes(role)
			);
			if (!validUser) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "user doesn't sufficient roles",
				});
			}

			const sessionToken = randomBytes(200).toString("base64url");
			await prisma.session.create({
				data: {
					token: sessionToken,
					user: {
						connect: {
							discordId: user.id,
						},
					},
				},
			});

			ctx.res.setCookie(SESSION_COOKIE_NAME, sessionToken, {
				path: "/",
				httpOnly: true,
				sameSite: "strict",
				maxAge: 24 * 60 * 60, // 1 day
				secure: env.NODE_ENV === "production",
			});
		}),

	signOut: authorizedProcedure.mutation(async ({ ctx }) => {
		ctx.res.clearCookie(SESSION_COOKIE_NAME, {
			path: "/",
		});
	}),
});

export const appRouter = router({
	me: authorizedProcedure.query(({ ctx }) => {
		return {
			id: ctx.user.id,
			username: ctx.user.discordUsername,
		};
	}),
	authorization: authorizationRouter,
	tweet: authorizedProcedure
		.input(
			z.object({
				text: z.string(),
				files: z.array(z.string()),
			})
		)
		.mutation(async ({ input }) => {
			const files = input.files.map((file) => path.join(tmpdir, file));
			await tweet(input.text, files);
		}),
});

export type AppRouter = typeof appRouter;
