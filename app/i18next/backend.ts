import resourcesToBackend from "i18next-resources-to-backend";

const translationModules = import.meta.glob("./translation/*.json");

export const bundleBackend = resourcesToBackend((language: string) => {
	const translationModule =
		translationModules[`./translation/${language}.json`];
	if (!translationModule) {
		throw new Error(`No translation module found for ${language}`);
	}
	return translationModule();
});
