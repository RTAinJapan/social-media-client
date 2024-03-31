import "i18next";

import en from "../../public/translation/en.json";
import ja from "../../public/translation/ja.json";

declare module "i18next" {
	interface CustomTypeOptions {
		resources: {
			translation: typeof en & typeof ja;
		};
	}
}
