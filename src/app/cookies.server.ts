import { createCookie } from "@remix-run/node";
import {
	DISCORD_OAUTH_STATE_COOKIE_NAME,
	SESSION_COOKIE_NAME,
} from "../lib/constant";

export const sessionCookie = createCookie(SESSION_COOKIE_NAME, {
	path: "/",
	httpOnly: true,
	sameSite: "lax",
	maxAge: 24 * 60 * 60,
	secure: process.env.NODE_ENV === "production",
});

export const discordOauthStateCookie = createCookie(
	DISCORD_OAUTH_STATE_COOKIE_NAME,
	{
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		maxAge: 10 * 60,
		secure: process.env.NODE_ENV === "production",
	}
);
