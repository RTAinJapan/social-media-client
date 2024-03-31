import { RemixBrowser } from "@remix-run/react";
import i18next from "i18next";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { I18nextProvider, initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import I18NextHttpBackend from "i18next-http-backend";
import { i18nextOptions } from "./i18next-options";
import { getInitialNamespaces } from "remix-i18next/client";

await i18next
	.use(initReactI18next)
	.use(LanguageDetector)
	.use(I18NextHttpBackend)
	.init({
		...i18nextOptions,
		ns: getInitialNamespaces(),
		backend: { loadPath: "/translation/{{lng}}.json" },
		detection: {
			order: ["htmlTag"],
			caches: [],
		},
	});

startTransition(() => {
	hydrateRoot(
		document,
		<I18nextProvider i18n={i18next}>
			<StrictMode>
				<RemixBrowser />
			</StrictMode>
		</I18nextProvider>
	);
});
