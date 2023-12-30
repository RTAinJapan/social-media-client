import { z } from "zod";
import { trpc } from "../trpc";
import { useForm } from "react-hook-form";

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
	const { register, handleSubmit, reset } = useForm<{
		tweetText: string;
		files: FileList;
	}>();
	const { mutate: tweet, isLoading } = trpc.tweet.useMutation({
		onSuccess: () => {
			reset();
			alert("ツイートしました");
		},
		onError: (error) => {
			console.error(error);
			alert("ツイートに失敗しました");
		},
	});

	return (
		<form
			style={{
				display: "grid",
				placeContent: "start",
				placeItems: "start",
				gap: "8px",
			}}
			onSubmit={handleSubmit(async (data) => {
				const text = data.tweetText;
				const files = await uploadFile(data.files);
				tweet({ text, files });
			})}
		>
			<textarea
				{...register("tweetText")}
				disabled={isLoading}
				style={{
					height: "200px",
					width: "300px",
				}}
			/>
			<input
				type="file"
				accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"
				multiple
				{...register("files")}
			/>
			<button type="submit" disabled={isLoading} style={{ justifySelf: "end" }}>
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
			<div>{twitterAccount?.username}としてツイートする</div>
			<TweetForm />
		</div>
	);
};
