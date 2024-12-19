import { env } from "../env.server";

export interface Run {
	id: number;
	gamename: string;
	category: string;
	runner: {
		username: string;
		twitterid: string;
	}[];
	commentary: {
		username: string;
		twitterid: string;
	}[];
}

export const getRuns = async (): Promise<Run[]> => {
	const apiUrl = env.RUNDATA_API_URL;
	if (!apiUrl) {
		return [];
	}

	try {
		const response = await fetch(apiUrl);

		if (!response.ok) {
			console.error("Failed to load runs");
			return [];
		}
		const json = (await response.json()) as { data: Run[] };
		return json.data;
	} catch (e) {
		console.error(e);
		return [];
	}
};
