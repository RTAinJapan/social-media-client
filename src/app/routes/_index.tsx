import twitterText from "twitter-text";
import { useReplyStore } from "../stores/reply";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useFetcher, useLoaderData } from "@remix-run/react";
import { assertSession } from "../session.server";
import { prisma } from "../prisma.server";
import { env } from "../../lib/env.server";
import { useEffect, useState } from "react";

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

const TweetTextInput = () => {
	const [tweetLength, setTweetLength] = useState(0);
	return (
		<>
			<textarea
				name="text"
				onChange={(e) => {
					setTweetLength(twitterText.getTweetLength(e.target.value));
				}}
				style={{ height: "200px", width: "100%" }}
			/>
			<div style={{ justifySelf: "end" }}>{tweetLength}/280</div>
		</>
	);
};

const TweetForm = () => {
	const fetcher = useFetcher();
	const sending = fetcher.state === "submitting";

	useEffect(() => {
		console.log(fetcher.data);
	}, [fetcher.data]);

	const reply = useReplyStore((store) => store.reply);
	const clearReply = useReplyStore((store) => store.clearReply);

	return (
		<fetcher.Form
			method="post"
			action="/send-tweet"
			encType="multipart/form-data"
			style={{
				display: "grid",
				gap: "8px",
			}}
		>
			{reply && (
				<div
					style={{
						color: "red",
						display: "grid",
						gap: "8px",
						gridTemplateColumns: "1fr auto",
						alignItems: "center",
					}}
				>
					<input type="hidden" name="replyToTweetId" value={reply} />
					<div>
						<a href={`https://twitter.com/x/status/${reply}`} target="_blank">
							ツイート
						</a>
						へのリプライとしてツイートする
					</div>
					<button
						onClick={() => {
							clearReply();
						}}
					>
						クリア
					</button>
				</div>
			)}
			<TweetTextInput />
			<input
				name="files"
				type="file"
				accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"
				multiple
			/>
			<button type="submit" disabled={sending} style={{ justifySelf: "end" }}>
				送信
			</button>
		</fetcher.Form>
	);
};

const DeleteTweetButton = ({ tweetId }: { tweetId: string }) => {
	const fetcher = useFetcher();

	return (
		<fetcher.Form
			method="post"
			action={`/delete-tweet/${tweetId}`}
			onSubmit={(e) => {
				if (!confirm("Are you sure to delete this tweet?")) {
					e.preventDefault();
				}
			}}
		>
			<button type="submit">削除</button>
		</fetcher.Form>
	);
};

const TweetList = () => {
	const data = useLoaderData<typeof loader>();
	const setReply = useReplyStore((store) => store.setReply);
	const reply = useReplyStore((store) => store.reply);

	return (
		<div style={{ display: "grid", gap: "8px" }}>
			{data.tweets.map((tweet) => (
				<div
					key={tweet.url}
					style={{
						padding: "4px",
						border: reply === tweet.id ? "2px solid red" : "1px solid black",
						display: "grid",
						gap: "4px",
					}}
				>
					<div>{tweet.text}</div>
					<div
						style={{
							display: "grid",
							gap: "2px",
							gridAutoFlow: "column",
							alignItems: "end",
							gridTemplateColumns: "1fr auto auto",
							justifyItems: "start",
						}}
					>
						<a href={tweet.url} target="_blank">
							{new Date(tweet.tweetedAt).toLocaleString()}
						</a>
						<button
							onClick={() => {
								setReply(tweet.id);
							}}
						>
							リプライ
						</button>
						<DeleteTweetButton tweetId={tweet.id} />
					</div>
				</div>
			))}
		</div>
	);
};

export default () => {
	const data = useLoaderData<typeof loader>();

	return (
		<div
			style={{
				margin: "8px",
				display: "grid",
				gap: "8px",
				maxWidth: "400px",
			}}
		>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr auto",
					placeSelf: "stretch",
				}}
			>
				<div>{data.session.username}としてログイン中</div>
				<Form method="post" action="/sign-out" style={{ justifySelf: "end" }}>
					<button type="submit">ログアウト</button>
				</Form>
			</div>
			<div>{data.twitterAccount}としてツイートする</div>
			<TweetForm />
			<TweetList />
		</div>
	);
};
