import { json } from "@remix-run/node";
import { sessionCookie } from "../cookies.server";
import { useActionData } from "@remix-run/react";
import { useEffect } from "react";

export default () => {
	const actionData = useActionData<typeof action>();

	useEffect(() => {
		if (typeof actionData === "undefined") {
			window.location.href = "/";
		}
	}, [actionData]);

	return (
		<div>
			<div>Successfully signed out</div>
			<a href="/">Sign in</a>
		</div>
	);
};

export const action = async () => {
	const setCookie = await sessionCookie.serialize("", {
		maxAge: 0,
	});
	return json(null, {
		headers: {
			"Set-Cookie": setCookie,
		},
	});
};
