import { z } from "zod";
import { trpc } from "../trpc";
import { useForm } from "react-hook-form";
import twitterText from "twitter-text";
import { useState } from "react";

const SignedOut = () => {
	const { data } = trpc.authorization.initialize.useQuery();
	return <a href={data?.oauthUrl}>ログイン</a>;
};

const uploadFileResponseSchema = z.array(z.string());
const uploadFile = async (files: FileList) => {
	const formdata = new FormData();
	for (const file of files) {
		formdata.append("files", file);
	}
	const res = await fetch(`${import.meta.env.VITE_API_ORIGIN}/file`, {
		method: "POST",
		body: formdata,
		credentials: "include",
	});
	if (!res.ok) {
		throw new Error("failed to upload file");
	}
	const json = await res.json();
	return uploadFileResponseSchema.parse(json);
};

const TweetForm = () => {
	const { register, handleSubmit, reset, watch } = useForm<{
		tweetText: string;
		files: FileList;
	}>();
	const { mutateAsync: tweet } = trpc.tweet.useMutation();

	const watchTweetText = watch("tweetText");
	const tweetLength = twitterText.getTweetLength(watchTweetText);

	const [sending, setSending] = useState(false);

	return (
		<form
			style={{
				display: "grid",
				placeContent: "start",
				placeItems: "start",
				gap: "8px",
			}}
			onSubmit={handleSubmit(async (data) => {
				try {
					setSending(true);
					const text = data.tweetText;
					const files = await uploadFile(data.files);
					await tweet({ text, files });
					alert("ツイートしました");
					reset();
				} catch (error) {
					console.error(error);
					alert("ツイートに失敗しました");
				} finally {
					setSending(false);
				}
			})}
		>
			<textarea
				{...register("tweetText")}
				disabled={sending}
				style={{
					height: "200px",
					width: "360px",
				}}
			/>
			<div style={{ justifySelf: "end" }}>{tweetLength}/280</div>
			<input
				type="file"
				accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"
				multiple
				{...register("files")}
			/>
			<button type="submit" disabled={sending} style={{ justifySelf: "end" }}>
				送信
			</button>
		</form>
	);
};

export const Component = () => {
	const trpcUtils = trpc.useUtils();
	const { mutate: signOut } = trpc.authorization.signOut.useMutation({
		onSuccess: () => {
			trpcUtils.me.invalidate();
		},
	});

	const { data: me, isRefetching, isLoading, isError } = trpc.me.useQuery();

	const { data: twitterAccount } = trpc.twitterAccount.useQuery();

	if (isLoading && !isRefetching) {
		return <div>loading...</div>;
	}

	if (isError) {
		return <SignedOut />;
	}

	return (
		<div
			style={{
				margin: "8px",
				display: "grid",
				placeContent: "start",
				placeItems: "start",
				gap: "8px",
			}}
		>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr auto",
					placeSelf: "stretch",
				}}
			>
				<div>{me?.username}としてログイン中</div>
				<button
					onClick={() => {
						signOut();
					}}
					style={{
						justifySelf: "end",
					}}
				>
					ログアウト
				</button>
			</div>
			<div>{twitterAccount?.username}としてツイートする</div>
			<TweetForm />
		</div>
	);
};
