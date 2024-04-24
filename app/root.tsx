import "./index.css";

import { Theme } from "@radix-ui/themes";

import type {
	MetaFunction,
	LinksFunction,
	LoaderFunctionArgs,
} from "@remix-run/node";
import {
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	isRouteErrorResponse,
	json,
	useLoaderData,
	useRouteError,
} from "@remix-run/react";
import { remixI18next } from "./i18next/remix-i18next";
import { useTranslation } from "react-i18next";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const locale = await remixI18next.getLocale(request);
	return json({ locale });
};

export const meta: MetaFunction = () => [
	{ charSet: "utf-8" },
	{ title: "Socials Client" },
	{ name: "viewport", content: "width=device-width, initial-scale=1" },
];

export const links: LinksFunction = () => [];

export default () => {
	const data = useLoaderData<typeof loader>();
	const { i18n } = useTranslation();

	return (
		<html lang={data.locale} dir={i18n.dir()}>
			<head>
				<Meta />
				<Links />
			</head>
			<body>
				<Theme>
					<Outlet />
				</Theme>
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
};

export const ErrorBoundary = () => {
	const error = useRouteError();

	if (!isRouteErrorResponse(error)) {
		return <div>Something went wrong</div>;
	}

	return (
		<div>
			<h1>{error.status}</h1>
			<p>{error.statusText}</p>
		</div>
	);
};
