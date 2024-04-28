import { useReplyStore } from "./reply-store";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { Button, Card, Link } from "@radix-ui/themes";
import type { loader } from "./route";
import { css } from "../../../styled-system/css";
import { useTranslation } from "react-i18next";
import { ClientOnly } from "../../components/client-only";

const DeleteTweetButton = ({ tweetId }: { tweetId: string }) => {
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
				<Card
					key={tweet.url}
					className={css(reply === tweet.id && { border: "1px solid red" })}
				>
					<div className={css({ display: "grid", gap: "4px" })}>
						<div>{tweet.text}</div>
						<div
							className={css({
								display: "grid",
								gap: "4px",
								gridAutoFlow: "column",
								gridTemplateColumns: "1fr auto auto",
								alignItems: "end",
							})}
						>
							<Link
								href={tweet.url}
								target="_blank"
								className={css({ display: "grid" })}
							>
								<ClientOnly>
									{new Date(tweet.tweetedAt).toLocaleString()}
								</ClientOnly>
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
				</Card>
			))}
		</div>
	);
};
