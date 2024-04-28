import "i18next";

import en from "../../app/i18next/translation/en.json";
import ja from "../../app/i18next/translation/ja.json";

declare module "i18next" {
	interface CustomTypeOptions {
		resources: {
			translation: typeof en & typeof ja;
		};
	}
}
