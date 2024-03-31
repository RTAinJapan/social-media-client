import Backend from "i18next-fs-backend";
import { RemixI18Next } from "remix-i18next/server";
import { i18nextOptions } from "./i18next-options";

export const i18next = new RemixI18Next({
	detection: {
		supportedLanguages: i18nextOptions.supportedLngs,
		fallbackLanguage: i18nextOptions.fallbackLng,
	},
	i18next: {
		...i18nextOptions,
		backend: {
			loadPath: "./public/translation/{{lng}}.json",
		},
	},
	plugins: [Backend],
});
