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
import { getTwitterEnabled, sendReply, tweet } from "../../api/twitter.server";
import { tmpDir } from "../../tmp-dir.server";
import { useTranslation } from "react-i18next";
import { SignOutButton } from "./sign-out-button";
import { getBlueskyEnabled, post } from "../../api/bluesky.server";
import fs from "node:fs/promises";

interface Post {
	twitterId?: string;
	blueskyId?: string;
	text: string;
	postedAt: Date;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const [session, tweets, blueskyPosts] = await Promise.all([
		assertSession(request),
		prisma.tweets.findMany({
			orderBy: {
				tweetedAt: "desc",
			},
			take: 100,
		}),
		prisma.blueskyPosts.findMany({
			orderBy: {
				postedAt: "desc",
			},
			take: 100,
		}),
	]);

	const posts: Post[] = [];
	for (const tweet of tweets) {
		posts.push({
			twitterId: tweet.tweetId,
			text: tweet.text,
			postedAt: tweet.tweetedAt,
		});
	}
	for (const blueskyPost of blueskyPosts) {
		const postWithSameText = posts.find(
			(p) =>
				p.text.replace(/\r?\n/g, "") ===
					blueskyPost.text.replace(/\r?\n/g, "") &&
				Math.abs(p.postedAt.getTime() - blueskyPost.postedAt.getTime()) <
					60 * 1000
		);
		if (postWithSameText) {
			postWithSameText.blueskyId = blueskyPost.postId;
		} else {
			posts.push({
				blueskyId: blueskyPost.postId,
				text: blueskyPost.text,
				postedAt: blueskyPost.postedAt,
			});
		}
	}

	posts.sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime());

	return json({
		session,
		posts,
		twitterUsername: env.TWITTER_USERNAME,
		blueskyUsername: env.BLUESKY_USERNAME,
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
				<TweetForm />
				<TweetList />
			</div>
		</div>
	);
}

const actionSchema = zfd.formData({
	text: zfd.text(z.string().optional()),
	service: zfd.repeatableOfType(zfd.text(z.enum(["twitter", "bluesky"]))),
	replyTwitterId: zfd.text(z.string().optional()),
	replyBlueskyId: zfd.text(z.string().optional()),
	quoteTwitterId: zfd.text(z.string().optional()),
	quoteBlueskyId: zfd.text(z.string().optional()),
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

		const {
			text,
			service,
			replyTwitterId,
			replyBlueskyId,
			quoteTwitterId,
			quoteBlueskyId,
		} = actionSchema.parse(formData);

		const postOnTwitter = service.includes("twitter");
		const postOnBluesky = service.includes("bluesky");

		const files = formData.getAll("files");
		const filePaths: string[] = [];
		for (const file of files) {
			if (file instanceof NodeOnDiskFile) {
				filePaths.push(file.getFilePath());
			}
		}

		if (
			typeof replyTwitterId === "string" ||
			typeof replyBlueskyId === "string"
		) {
			await Promise.all([
				postOnTwitter &&
					replyTwitterId &&
					getTwitterEnabled() &&
					sendReply(replyTwitterId, text ?? "", filePaths, quoteTwitterId),
				postOnBluesky &&
					replyBlueskyId &&
					getBlueskyEnabled() &&
					post(text ?? "", filePaths, replyBlueskyId, quoteBlueskyId),
			]);
		} else {
			await Promise.all([
				postOnTwitter &&
					getTwitterEnabled() &&
					tweet(text ?? "", filePaths, quoteTwitterId),
				postOnBluesky &&
					getBlueskyEnabled() &&
					post(text ?? "", filePaths, undefined, quoteBlueskyId),
			]);
		}

		await Promise.all(filePaths.map((filePath) => fs.rm(filePath)));

		return json({ ok: true, data: text } as const);
	} catch (error) {
		console.error(error);
		const message = error instanceof Error ? error.message : String(error);
		return json({ ok: false, error: message } as const, { status: 500 });
	}
};
