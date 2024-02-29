import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { discordOauthStateCookie, sessionCookie } from "../cookies.server";
import { env } from "../../lib/env.server";
import ky from "ky";
import { randomBytes } from "node:crypto";
import { prisma } from "../prisma.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");

	if (!code) {
		return new Response("missing code", { status: 400 });
	}

	const cookieHeader = request.headers.get("Cookie");
	const cookieState: string = await discordOauthStateCookie.parse(cookieHeader);

	if (state !== cookieState) {
		return new Response("mismatch state", { status: 400 });
	}

	const authorizationHeader = Buffer.from(
		`${env.DISCORD_CLIENT_ID}:${env.DISCORD_CLIENT_SECRET}`
	).toString("base64");
	const token = await ky
		.post("https://discord.com/api/v10/oauth2/token", {
			body: new URLSearchParams({
				grant_type: "authorization_code",
				code,
				redirect_uri: new URL("/validate-oauth", env.SERVER_ORIGIN).href,
			}),
			headers: {
				authorization: `Basic ${authorizationHeader}`,
			},
		})
		.json<{
			access_token: string;
			token_type: string;
			expires_in: number;
			refresh_token: string;
			scope: string;
		}>();

	const discordApiToken = `${token.token_type} ${token.access_token}`;

	const user = await ky
		.get("https://discord.com/api/users/@me", {
			headers: { authorization: discordApiToken },
		})
		.json<{ id: string; username: string; discriminator: string }>();

	const userGuild = await ky
		.get(
			`https://discord.com/api/users/@me/guilds/${env.DISCORD_SERVER_ID}/member`,
			{ headers: { authorization: discordApiToken } }
		)
		.json<{ roles: string[] }>();

	const validRoleIds = env.DISCORD_VALID_ROLE_IDS.split(",");
	const validUser = userGuild.roles.some((role) => validRoleIds.includes(role));
	if (!validUser) {
		return new Response("invalid user", { status: 400 });
	}

	const sessionToken = randomBytes(200).toString("base64url");
	await prisma.session.create({
		data: {
			discordUsername: user.username,
			token: sessionToken,
		},
	});

	const setCookie = await sessionCookie.serialize(sessionToken);

	throw redirect("/", {
		headers: {
			"Set-Cookie": setCookie,
		},
	});
};
