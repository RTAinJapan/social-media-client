import { useReplyStore } from "../../stores/reply";
import { useFetcher } from "@remix-run/react";
import { useEffect, useId, useState } from "react";
import { Button, Link, TextArea } from "@radix-ui/themes";
import twitterText from "twitter-text";
import { css } from "../../../../styled-system/css";
import type { action } from "./route";

const imageFileTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const videoFileTypes = ["video/mp4", "video/quicktime"];

const TweetTextInput = ({ disabled }: { disabled: boolean }) => {
	const [tweetLength, setTweetLength] = useState(0);
	return (
		<>
			<TextArea
				name="text"
				onChange={(e) => {
					setTweetLength(twitterText.getTweetLength(e.target.value));
				}}
				disabled={disabled}
				className={css({ height: "200px", width: "100%" })}
			/>
			<div className={css({ justifySelf: "end" })}>{tweetLength}/280</div>
		</>
	);
};

const ImageFileInput = () => {
	const inputId = useId();
	const [files, setFiles] = useState<File[] | null>(null);

	return (
		<div className={css({ display: "grid", gap: "8px" })}>
			<div>
				<Button asChild className={css({ justifySelf: "start" })}>
					<label htmlFor={inputId}>画像・動画を添付</label>
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
	const reply = useReplyStore((store) => store.reply);
	const clearReply = useReplyStore((store) => store.clearReply);

	if (!reply) {
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
			<input type="hidden" name="replyToTweetId" value={reply} />
			<div>
				<Link href={`https://twitter.com/x/status/${reply}`} target="_blank">
					ツイート
				</Link>
				へのリプライとしてツイートする
			</div>
			<Button
				onClick={() => {
					clearReply();
				}}
			>
				クリア
			</Button>
		</div>
	);
};

export const TweetForm = () => {
	const fetcher = useFetcher<typeof action>();
	const sending = fetcher.state === "submitting";
	const [formKey, setFormKey] = useState(0);
	const clearReply = useReplyStore((store) => store.clearReply);

	useEffect(() => {
		if (fetcher.state === "loading") {
			if (fetcher.data?.ok) {
				alert(`ツイートしました: ${fetcher.data.data}`);
				setFormKey((n) => n + 1);
				clearReply();
			} else {
				alert(`ツイートに失敗しました: ${fetcher.data?.error}`);
			}
		}
	}, [fetcher.state]);

	return (
		<fetcher.Form
			method="post"
			encType="multipart/form-data"
			className={css({
				display: "grid",
				gap: "8px",
			})}
			key={formKey}
		>
			<ReplyDisplay />
			<TweetTextInput disabled={sending} />
			<ImageFileInput />
			<Button
				type="submit"
				disabled={sending}
				className={css({ justifySelf: "end" })}
			>
				送信
			</Button>
		</fetcher.Form>
	);
};
