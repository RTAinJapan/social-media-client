import type { Run } from "../../api/runs.server";

interface Template {
	label:
		| "setup"
		| "finishWithTime"
		| "finishWithoutTime"
		| "finishOnlyTime"
		| "running"
		| "backup";
	apply: (run: Run) => string;
}

const presentRunners = (runners: Run["runner"]) => {
	return runners
		.map((runner) => {
			const name = runner.username.replaceAll("@", "@ ");
			return `${name}さん(@${runner.twitterid})`;
		})
		.join("、");
};

export const templates: Template[] = [
	{
		label: "setup",
		apply: (run) =>
			`次のタイムアタックは『${run.gamename}』\nカテゴリーは「${
				run.category
			}」\n走者は${presentRunners(
				run.runner
			)}です。\n\n配信はこちらから⇒https://www.twitch.tv/rtainjapan\n#RTAinJapan`,
	},
	{
		label: "finishWithTime",
		apply: (run) =>
			`『${run.gamename}』のカテゴリー「${
				run.category
			}」RTA\n走者の${presentRunners(
				run.runner
			)}お疲れさまでした。\nクリアタイムはxx:xx:xxでした。\n\n配信はこちらから⇒https://www.twitch.tv/rtainjapan\n#RTAinJapan`,
	},
	{
		label: "finishWithoutTime",
		apply: (run) =>
			`『${run.gamename}』のカテゴリー「${
				run.category
			}」RTA\n走者の${presentRunners(
				run.runner
			)}お疲れさまでした。\n\n配信はこちらから⇒https://www.twitch.tv/rtainjapan\n#RTAinJapan`,
	},
	{
		label: "finishOnlyTime",
		apply: (run) =>
			`『${run.gamename}』\nクリアタイムは次の通りです\n\n\n配信はこちらから⇒https://www.twitch.tv/rtainjapan\n#RTAinJapan`,
	},
	{
		label: "running",
		apply: (run) =>
			`現在のタイムアタックは『${run.gamename}』\n\n\n\n配信はこちらから⇒https://www.twitch.tv/rtainjapan\n#RTAinJapan`,
	},
	{
		label: "backup",
		apply: (run) =>
			`【バックアップ追加のお知らせ】\n「xxx」の終了後、バックアップとして『${run.gamename}』を追加いたします。\n\n\n配信はこちらから⇒https://www.twitch.tv/rtainjapan\n#RTAinJapan`,
	},
] as const;
