import "./index.css";

import { Theme } from "@radix-ui/themes";

import type { MetaFunction, LinksFunction } from "@remix-run/node";
import {
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	isRouteErrorResponse,
	useRouteError,
} from "@remix-run/react";

export const meta: MetaFunction = () => [
	{ charSet: "utf-8" },
	{ title: "Socials Client" },
	{ name: "viewport", content: "width=device-width, initial-scale=1" },
];

export const links: LinksFunction = () => [];

export default () => {
	return (
		<html>
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
