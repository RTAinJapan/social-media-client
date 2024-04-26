import "./root/index.css";

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
import { FullscreenSpinner } from "./root/fullscreen-spinner";
import type { PropsWithChildren } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const locale = await remixI18next.getLocale(request);
	return json({ locale });
};

export const meta: MetaFunction = () => [
	{ charSet: "utf-8" },
	{ title: "Socials Client" },
	{ name: "viewport", content: "width=device-width, initial-scale=1" },
];

export const links: LinksFunction = () => [{ rel: "icon", href: "data:," }];

const Document = ({
	children,
	locale,
}: PropsWithChildren<{ locale: string }>) => {
	const { i18n } = useTranslation();
	return (
		<html lang={locale} dir={i18n.dir()}>
			<head>
				<Meta />
				<Links />
			</head>
			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
};

export default function Root() {
	const data = useLoaderData<typeof loader>();
	return (
		<Document locale={data.locale}>
			<Theme>
				<Outlet />
				<FullscreenSpinner />
			</Theme>
		</Document>
	);
}

export const ErrorBoundary = () => {
	const error = useRouteError();

	if (!isRouteErrorResponse(error)) {
		return (
			<Document locale="en">
				<div>Something went wrong</div>
			</Document>
		);
	}

	return (
		<Document locale="en">
			<div>
				<h1>
					{error.status} {error.statusText}
				</h1>
				<p>{error.data}</p>
			</div>
		</Document>
	);
};
