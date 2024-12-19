import { useReplyStore } from "./reply-store";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { useEffect, useId, useState } from "react";
import {
	Avatar,
	Badge,
	Button,
	CheckboxGroup,
	Dialog,
	Flex,
	Link,
	TextArea,
} from "@radix-ui/themes";
import twitterText from "twitter-text";
import { css } from "../../../styled-system/css";
import type { loader, action } from "./route";
import { useTranslation } from "react-i18next";
import { FullscreenSpinner } from "../../components/fullscreen-spinner";
import { useQuoteStore } from "./quote-store";
import twitterLogo from "./twitter-logo.png";
import blueskyLogo from "./bluesky-logo.png";

const imageFileTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const videoFileTypes = ["video/mp4", "video/quicktime"];

const TweetTextInput = () => {
	const [tweetLength, setTweetLength] = useState(0);
	const quoteExists = Boolean(useQuoteStore((store) => store.twitterId));
	const suggestLengthOver = tweetLength > 280;

	return (
		<>
			<TextArea
				name="text"
				onChange={(e) => {
					setTweetLength(
						twitterText.getTweetLength(e.target.value) + (quoteExists ? 23 : 0)
					);
				}}
				className={css({ height: "150px", width: "100%" })}
				{...(suggestLengthOver ? { color: "red" } : {})}
			/>
			<div
				className={css({
					justifySelf: "end",
					...(suggestLengthOver ? { color: "red" } : {}),
				})}
			>
				{tweetLength}/280
			</div>
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

const ConfirmDialog = ({
	form,
	onConfirm,
	onCancel,
}: {
	form: HTMLFormElement;
	onConfirm: () => void;
	onCancel: () => void;
}) => {
	const { t } = useTranslation();

	const text = (form.elements.namedItem("text") as HTMLInputElement | null)
		?.value;
	const files = (form.elements.namedItem("files") as HTMLInputElement | null)
		?.files;

	const submittable = !(!text && (files?.length ?? 0) === 0);

	return (
		<Dialog.Root open={true}>
			<Dialog.Content>
				<Dialog.Title>{t("confirmTweetQuestion")}</Dialog.Title>
				<Flex direction="column" gap="3">
					<TextArea value={text} readOnly />
					<div
						className={css({
							display: "grid",
							gridTemplateColumns: "repeat(2, auto)",
							gridTemplateRows: "repeat(2, auto)",
							gap: "4px",
						})}
					>
						{files &&
							Array.from(files).map((file) =>
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
					<Flex direction="row-reverse" gap="3">
						<Button color="gray" onClick={onCancel}>
							{t("cancel")}
						</Button>
						<Button onClick={onConfirm} disabled={!submittable}>
							{t("submit")}
						</Button>
					</Flex>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
};

const QuotePreview = () => {
	const data = useLoaderData<typeof loader>();
	const quoteTwitterId = useQuoteStore((store) => store.twitterId);
	const quoteBlueskyId = useQuoteStore((store) => store.blueskyId);
	const clearQuote = useQuoteStore((store) => store.clearQuote);

	const quoteTweet =
		quoteTwitterId && data.posts.find((p) => p.twitterId === quoteTwitterId);
	const quoteBluesky =
		quoteBlueskyId && data.posts.find((p) => p.blueskyId === quoteBlueskyId);
	const quoteExists = Boolean(quoteTwitterId) || Boolean(quoteBlueskyId);

	const { t } = useTranslation();

	return (
		quoteExists && (
			<Flex direction="column" gap="2" justify="end">
				<Flex direction="row" gap="2" justify="between">
					<div>{t("quote")}</div>
					<Button onClick={clearQuote}>{t("clear")}</Button>
				</Flex>
				{quoteTweet && (
					<Badge>
						<div
							className={css({
								display: "grid",
								gridTemplateColumns: "auto 240px",
								alignItems: "center",
								gap: "4px",
								padding: "4px",
							})}
						>
							<Avatar
								src={twitterLogo}
								fallback="Twitter"
								alt="Twitter"
								size="1"
							/>
							<div
								style={{
									whiteSpace: "collapse",
								}}
							>
								{quoteTweet.text}
							</div>
						</div>
					</Badge>
				)}
				{quoteBluesky && (
					<Badge>
						<div
							className={css({
								display: "grid",
								gridTemplateColumns: "auto 240px",
								alignItems: "center",
								gap: "4px",
								padding: "4px",
							})}
						>
							<Avatar
								src={blueskyLogo}
								fallback="Bluesky"
								alt="Bluesky"
								size="1"
							/>
							<div
								style={{
									whiteSpace: "collapse",
								}}
							>
								{quoteBluesky.text}
							</div>
						</div>
					</Badge>
				)}
				<input type="hidden" name="quoteTwitterId" value={quoteTwitterId} />
				<input type="hidden" name="quoteBlueskyId" value={quoteBlueskyId} />
			</Flex>
		)
	);
};

export const TweetForm = () => {
	const fetcher = useFetcher<typeof action>();
	const sending = fetcher.state === "submitting";
	const { t } = useTranslation();

	const [formKey, setFormKey] = useState(0);
	const clearReply = useReplyStore((store) => store.clearReply);
	const clearQuote = useQuoteStore((store) => store.clearQuote);
	useEffect(() => {
		if (fetcher.state === "loading" && fetcher.data?.ok) {
			setFormKey((key) => key + 1);
			clearReply();
			clearQuote();
		}
	}, [fetcher.state, fetcher.data?.ok, clearReply, clearQuote]);

	const [confirmForm, setConfirmForm] = useState<HTMLFormElement | null>(null);

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
				onSubmit={(e) => {
					e.preventDefault();
					setConfirmForm(e.currentTarget);
				}}
			>
				<ServiceSelect />
				<ReplyDisplay />
				<TweetTextInput />
				<QuotePreview />
				<ImageFileInput />
				<Button type="submit" className={css({ justifySelf: "end" })}>
					{t("submit")}
				</Button>
			</fetcher.Form>
			<FullscreenSpinner show={sending} />
			{confirmForm && (
				<ConfirmDialog
					form={confirmForm}
					onConfirm={() => {
						fetcher.submit(confirmForm);
						setConfirmForm(null);
					}}
					onCancel={() => {
						setConfirmForm(null);
					}}
				/>
			)}
		</>
	);
};
