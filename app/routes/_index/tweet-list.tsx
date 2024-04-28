import { useReplyStore } from "./reply-store";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { Avatar, Button, Card } from "@radix-ui/themes";
import type { loader } from "./route";
import { css } from "../../../styled-system/css";
import { useTranslation } from "react-i18next";
import { ClientOnly } from "../../components/client-only";
import twitterLogo from "./twitter-logo.png";
import blueskyLogo from "./bluesky-logo.png";
import { FullscreenSpinner } from "../../components/fullscreen-spinner";

const DeletePostButton = ({
	twitterId,
	blueskyId,
}: {
	twitterId?: string;
	blueskyId?: string;
}) => {
	const fetcher = useFetcher();
	const { t } = useTranslation();
	const sending = fetcher.state === "submitting";

	return (
		<>
			<fetcher.Form
				method="post"
				action={`/delete-post`}
				onSubmit={(e) => {
					if (!confirm("Are you sure to delete this post?")) {
						e.preventDefault();
					}
				}}
			>
				{twitterId && (
					<input type="hidden" name="twitterId" value={twitterId} />
				)}
				{blueskyId && (
					<input type="hidden" name="blueskyId" value={blueskyId} />
				)}
				<Button type="submit">{t("delete")}</Button>
			</fetcher.Form>
			<FullscreenSpinner show={sending} />
		</>
	);
};

export const TweetList = () => {
	const data = useLoaderData<typeof loader>();
	const setReply = useReplyStore((store) => store.setReply);
	const replyTwitterId = useReplyStore((store) => store.twitterId);
	const replyBlueskyId = useReplyStore((store) => store.blueskyId);
	const { t } = useTranslation();

	return (
		<div className={css({ display: "grid", gap: "8px" })}>
			{data.posts.map((post) => (
				<Card
					key={(post.twitterId ?? "") + (post.blueskyId ?? "")}
					className={css(
						((typeof post.twitterId === "string" &&
							replyTwitterId === post.twitterId) ||
							(typeof post.blueskyId === "string" &&
								replyBlueskyId === post.blueskyId)) && {
							border: "1px solid red",
						}
					)}
				>
					<div className={css({ display: "grid", gap: "8px" })}>
						<div
							className={css({
								display: "grid",
								gap: "8px",
								gridAutoFlow: "column",
								justifyContent: "start",
								alignItems: "center",
							})}
						>
							{post.twitterId && (
								<a
									href={`https://twitter.com/${data.twitterUsername}/status/${post.twitterId}`}
									target="_blank"
								>
									<Avatar
										src={twitterLogo}
										fallback="Twitter"
										alt="Twitter"
										size="1"
									/>
								</a>
							)}
							{post.blueskyId && (
								<a
									href={`https://bsky.app/profile/${
										data.blueskyUsername
									}/post/${post.blueskyId.split("/").at(-1)}`}
									target="_blank"
								>
									<Avatar
										src={blueskyLogo}
										fallback="Bluesky"
										alt="Bluesky"
										size="1"
									/>
								</a>
							)}
						</div>
						<div>{post.text}</div>
						<div
							className={css({
								display: "grid",
								gap: "4px",
								gridAutoFlow: "column",
								gridTemplateColumns: "1fr auto auto",
								alignItems: "end",
							})}
						>
							<div className={css({ display: "grid" })}>
								<ClientOnly>
									{new Date(post.postedAt).toLocaleString()}
								</ClientOnly>
							</div>
							<Button
								onClick={() => {
									setReply({
										twitterId: post.twitterId,
										blueskyId: post.blueskyId,
									});
								}}
							>
								{t("reply")}
							</Button>
							<DeletePostButton
								twitterId={post.twitterId}
								blueskyId={post.blueskyId}
							/>
						</div>
					</div>
				</Card>
			))}
		</div>
	);
};
