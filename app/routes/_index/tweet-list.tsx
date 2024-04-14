import { useReplyStore } from "../../stores/reply";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { Button, Link } from "@radix-ui/themes";
import type { loader } from "./route";
import { css } from "../../../styled-system/css";
import { useTranslation } from "react-i18next";

export const DeleteTweetButton = ({ tweetId }: { tweetId: string }) => {
	const fetcher = useFetcher();
	const { t } = useTranslation();

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
			<Button type="submit">{t("delete")}</Button>
		</fetcher.Form>
	);
};

export const TweetList = () => {
	const data = useLoaderData<typeof loader>();
	const setReply = useReplyStore((store) => store.setReply);
	const reply = useReplyStore((store) => store.reply);
	const { t } = useTranslation();

	return (
		<div className={css({ display: "grid", gap: "8px" })}>
			{data.tweets.map((tweet) => (
				<div
					key={tweet.url}
					className={css(
						{
							padding: "4px",
							border: "1px solid black",
							display: "grid",
							gap: "4px",
						},
						reply === tweet.id && { border: "2px solid red" }
					)}
				>
					<div>{tweet.text}</div>
					<div
						className={css({
							display: "grid",
							gap: "2px",
							gridAutoFlow: "column",
							alignItems: "end",
							gridTemplateColumns: "1fr auto auto",
							justifyItems: "start",
						})}
					>
						<Link href={tweet.url} target="_blank">
							{new Date(tweet.tweetedAt).toLocaleString()}
						</Link>
						<Button
							onClick={() => {
								setReply(tweet.id);
							}}
						>
							{t("reply")}
						</Button>
						<DeleteTweetButton tweetId={tweet.id} />
					</div>
				</div>
			))}
		</div>
	);
};
