import { PassThrough } from "node:stream";

import type { AppLoadContext, EntryContext } from "@remix-run/node";
import { createReadableStreamFromReadable } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { createInstance } from "i18next";
import { remixI18next } from "./i18next/remix-i18next.server";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { i18nextOptions } from "./i18next/options";
import { bundleBackend } from "./i18next/backend";

const ABORT_DELAY = 5_000;

export default async function handleRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	remixContext: EntryContext,
	_loadContext: AppLoadContext
) {
	const isBot = isbot(request.headers.get("user-agent"));

	const i18nextInstance = createInstance();
	const lng = await remixI18next.getLocale(request);
	const ns = remixI18next.getRouteNamespaces(remixContext);

	await i18nextInstance
		.use(initReactI18next)
		.use(bundleBackend)
		.init({
			...i18nextOptions,
			lng,
			ns,
		});

	return new Promise((resolve, reject) => {
		let shellRendered = false;

		const onReady = () => {
			shellRendered = true;
			const body = new PassThrough();
			const stream = createReadableStreamFromReadable(body);

			responseHeaders.set("Content-Type", "text/html");

			resolve(
				new Response(stream, {
					headers: responseHeaders,
					status: responseStatusCode,
				})
			);

			pipe(body);
		};

		const { pipe, abort } = renderToPipeableStream(
			<I18nextProvider i18n={i18nextInstance}>
				<RemixServer
					context={remixContext}
					url={request.url}
					abortDelay={ABORT_DELAY}
				/>
			</I18nextProvider>,
			{
				onAllReady: isBot ? onReady : undefined,
				onShellReady: isBot ? undefined : onReady,
				onShellError(error: unknown) {
					reject(error);
				},
				onError(error: unknown) {
					responseStatusCode = 500;
					// Log streaming rendering errors from inside the shell.  Don't log
					// errors encountered during initial shell rendering since they'll
					// reject and get logged in handleDocumentRequest.
					if (shellRendered) {
						console.error(error);
					}
				},
			}
		);

		setTimeout(abort, ABORT_DELAY);
	});
}
