import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { assertSession } from "../../session.server";
import { prisma } from "../../prisma.server";
import { env } from "../../env.server";
import { css } from "../../../styled-system/css";
import { TweetForm } from "./tweet-form";
import { TweetList } from "./tweet-list";
import {
	type ActionFunctionArgs,
	unstable_parseMultipartFormData,
	unstable_createFileUploadHandler,
	unstable_composeUploadHandlers,
	unstable_createMemoryUploadHandler,
	NodeOnDiskFile,
} from "@remix-run/node";
import { zfd } from "zod-form-data";
import { z } from "zod";
import {
	getTweets,
	getTwitterEnabled,
	sendReply,
	tweet,
} from "../../api/twitter.server";
import { tmpDir } from "../../tmp-dir.server";
import { useTranslation } from "react-i18next";
import { SignOutButton } from "./sign-out-button";
import { getBlueskyEnabled, post } from "../../api/bluesky.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const [session, tweets] = await Promise.all([
		assertSession(request),
		prisma.tweets.findMany({
			orderBy: {
				tweetedAt: "desc",
			},
			take: 10,
		}),
	]);
	return json({
		session,
		tweets: tweets.map((tweet) => ({
			id: tweet.tweetId,
			url: `https://twitter.com/${env.TWITTER_USERNAME}/status/${tweet.tweetId}`,
			text: tweet.text,
			tweetedAt: tweet.tweetedAt.toISOString(),
		})),
		twitterAccount: env.TWITTER_USERNAME,
	});
};

export default function IndexPage() {
	const data = useLoaderData<typeof loader>();
	const { t } = useTranslation();

	return (
		<div
			className={css({
				width: "100vw",
				height: "100vh",
				display: "grid",
				justifyContent: "center",
			})}
		>
			<div
				className={css({
					padding: "8px",
					display: "grid",
					alignContent: "start",
					gap: "8px",
					maxWidth: "100vw",
					width: "400px",
				})}
			>
				<div
					className={css({
						display: "grid",
						gridTemplateColumns: "1fr auto",
						placeSelf: "stretch",
					})}
				>
					<div>{t("signedInAs", { username: data.session.username })}</div>
					<div className={css({ justifySelf: "end" })}>
						<SignOutButton />
					</div>
				</div>
				<div>{t("tweetAsAccount", { account: data.twitterAccount })}</div>
				<TweetForm />
				<TweetList />
			</div>
		</div>
	);
}

const actionSchema = zfd.formData({
	text: zfd.text(z.string().optional()),
	replyToTweetId: zfd.text(z.string().optional()),
});

export const action = async ({ request }: ActionFunctionArgs) => {
	await assertSession(request);

	try {
		const formData = await unstable_parseMultipartFormData(
			request,
			unstable_composeUploadHandlers(
				unstable_createFileUploadHandler({
					maxPartSize: 100_000_000,
					directory: tmpDir,
				}),
				unstable_createMemoryUploadHandler()
			)
		);

		const { text, replyToTweetId } = actionSchema.parse(formData);

		const files = formData.getAll("files");
		const filePaths: string[] = [];
		for (const file of files) {
			if (file instanceof NodeOnDiskFile) {
				filePaths.push(file.getFilePath());
			}
		}

		if (replyToTweetId) {
			await sendReply(replyToTweetId, text ?? "", filePaths);
		} else {
			await Promise.all([
				getTwitterEnabled() && tweet(text ?? "", filePaths),
				getBlueskyEnabled() && post(text ?? "", filePaths),
			]);
		}

		await getTweets().catch((error) => {
			console.error(error);
		});

		return json({ ok: true, data: text } as const);
	} catch (error) {
		console.error(error);
		const message = error instanceof Error ? error.message : String(error);
		return json({ ok: false, error: message } as const, { status: 500 });
	}
};
