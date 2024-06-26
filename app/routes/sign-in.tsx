import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { discordOauthStateCookie } from "../cookies.server";
import { env } from "../env.server";
import { randomBytes } from "crypto";
import { parseSession } from "../session.server";
import { Button } from "@radix-ui/themes";
import { Form } from "@remix-run/react";
import { css } from "../../styled-system/css";
import { useTranslation } from "react-i18next";

const discordOauthRedirectUrl = new URL("/validate-oauth", env.SERVER_ORIGIN);

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const session = await parseSession(request);
	if (session) {
		throw redirect("/");
	}
	return null;
};

export default () => {
	const { t } = useTranslation();
	return (
		<Form
			method="post"
			className={css({
				width: "100vw",
				height: "100vh",
				display: "grid",
				placeItems: "center",
			})}
		>
			<Button type="submit">{t("signInWithDiscord")}</Button>
		</Form>
	);
};

export const action = async () => {
	const state = randomBytes(100).toString("base64url");

	const url = new URL("https://discord.com/oauth2/authorize");
	url.searchParams.append("response_type", "code");
	url.searchParams.append("client_id", env.DISCORD_CLIENT_ID);
	url.searchParams.append("scope", "identify guilds.members.read");
	url.searchParams.append("state", state);
	url.searchParams.append("redirect_uri", discordOauthRedirectUrl.href);

	throw redirect(url.href, {
		headers: {
			"Set-Cookie": await discordOauthStateCookie.serialize(state),
		},
	});
};
