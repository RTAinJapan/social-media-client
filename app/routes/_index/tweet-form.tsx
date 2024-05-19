import { useReplyStore } from "./reply-store";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { useEffect, useId, useState } from "react";
import { Button, CheckboxGroup, Link, TextArea } from "@radix-ui/themes";
import twitterText from "twitter-text";
import { css } from "../../../styled-system/css";
import type { loader, action } from "./route";
import { useTranslation } from "react-i18next";
import { FullscreenSpinner } from "../../components/fullscreen-spinner";

const imageFileTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const videoFileTypes = ["video/mp4", "video/quicktime"];

const TweetTextInput = () => {
	const [tweetLength, setTweetLength] = useState(0);
	return (
		<>
			<TextArea
				name="text"
				onChange={(e) => {
					setTweetLength(twitterText.getTweetLength(e.target.value));
				}}
				className={css({ height: "150px", width: "100%" })}
			/>
			<div className={css({ justifySelf: "end" })}>{tweetLength}/280</div>
		</>
	);
};

const ImageFileInput = () => {
	const inputId = useId();
	const [files, setFiles] = useState<File[] | null>(null);
	const { t } = useTranslation();

	return (
		<div className={css({ display: "grid", gap: "8px" })}>
			<div>
				<Button asChild className={css({ justifySelf: "start" })}>
					<label htmlFor={inputId}>{t("uploadMedia")}</label>
				</Button>
				<input
					name="files"
					type="file"
					hidden
					accept={[...imageFileTypes, ...videoFileTypes].join(",")}
					multiple
					id={inputId}
					onChange={(e) => {
						setFiles(e.target.files ? Array.from(e.target.files) : null);
					}}
				/>
			</div>
			<div
				className={css({
					display: "grid",
					gridTemplateColumns: "repeat(2, auto)",
					gridTemplateRows: "repeat(2, auto)",
					gap: "4px",
				})}
			>
				{files?.map((file) =>
					imageFileTypes.includes(file.type) ? (
						<img
							key={file.name}
							src={URL.createObjectURL(file)}
							alt={file.name}
						/>
					) : (
						<video
							key={file.name}
							src={URL.createObjectURL(file)}
							controls
							muted
						/>
					)
				)}
			</div>
		</div>
	);
};

const ReplyDisplay = () => {
	const replyTwitterId = useReplyStore((store) => store.twitterId);
	const replyBlueskyId = useReplyStore((store) => store.blueskyId);
	const clearReply = useReplyStore((store) => store.clearReply);
	const { t } = useTranslation();

	if (!replyTwitterId && !replyBlueskyId) {
		return;
	}

	return (
		<div
			className={css({
				color: "red",
				display: "grid",
				gap: "8px",
				gridTemplateColumns: "1fr auto",
				alignItems: "center",
			})}
		>
			<input type="hidden" name="replyTwitterId" value={replyTwitterId} />
			<input type="hidden" name="replyBlueskyId" value={replyBlueskyId} />
			<div>{t("tweetAsReply")}</div>
			<Button
				onClick={() => {
					clearReply();
				}}
			>
				{t("clear")}
			</Button>
		</div>
	);
};

const ServiceSelect = () => {
	const data = useLoaderData<typeof loader>();
	const serviceDefaultValue = [];
	if (data.twitterUsername) {
		serviceDefaultValue.push("twitter");
	}
	if (data.blueskyUsername) {
		serviceDefaultValue.push("bluesky");
	}

	return (
		<CheckboxGroup.Root name="service" defaultValue={serviceDefaultValue}>
			{data.twitterUsername && (
				<CheckboxGroup.Item value="twitter">
					Twitter:&nbsp;
					<Link href={`https://x.com/${data.twitterUsername}`} target="_blank">
						@{data.twitterUsername}
					</Link>
				</CheckboxGroup.Item>
			)}
			{data.blueskyUsername && (
				<CheckboxGroup.Item value="bluesky">
					Bluesky:&nbsp;
					<Link
						href={`https://bsky.app/profile/${data.blueskyUsername}`}
						target="_blank"
					>
						@{data.blueskyUsername}
					</Link>
				</CheckboxGroup.Item>
			)}
		</CheckboxGroup.Root>
	);
};

export const TweetForm = () => {
	const fetcher = useFetcher<typeof action>();
	const sending = fetcher.state === "submitting";
	const { t } = useTranslation();

	const [formKey, setFormKey] = useState(0);
	const clearReply = useReplyStore((store) => store.clearReply);
	useEffect(() => {
		if (fetcher.state === "loading" && fetcher.data?.ok) {
			setFormKey((key) => key + 1);
			clearReply();
		}
	}, [fetcher.state, fetcher.data?.ok, clearReply]);

	return (
		<>
			{fetcher.data?.ok === false && (
				<div className={css({ color: "red" })}>
					{t("tweetFailed")}: {fetcher.data.error}
				</div>
			)}
			<fetcher.Form
				method="post"
				encType="multipart/form-data"
				className={css({
					display: "grid",
					gap: "8px",
				})}
				key={formKey}
			>
				<ServiceSelect />
				<ReplyDisplay />
				<TweetTextInput />
				<ImageFileInput />
				<Button type="submit" className={css({ justifySelf: "end" })}>
					{t("submit")}
				</Button>
			</fetcher.Form>
			<FullscreenSpinner show={sending} />
		</>
	);
};
