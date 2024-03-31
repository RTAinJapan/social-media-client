import { redirect } from "@remix-run/node";
import { sessionCookie } from "../cookies.server";

export const action = async () => {
	const setCookie = await sessionCookie.serialize("", {
		maxAge: 0,
	});
	throw redirect("/", {
		headers: {
			"Set-Cookie": setCookie,
		},
	});
};
