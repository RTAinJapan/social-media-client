import { trpc } from "../trpc";
import { useForm } from "react-hook-form";

const SignedOut = () => {
	const { data } = trpc.authorization.initialize.useQuery();
	return <a href={data?.oauthUrl}>ログイン</a>;
};

const fileToBase64 = (file: File) => {
	const reader = new FileReader();
	reader.readAsDataURL(file);
	return new Promise<string>((resolve) => {
		reader.onload = () => {
			if (typeof reader.result === "string") {
				const base64 = reader.result.split(",")[1];
				if (base64) {
					resolve(base64);
				}
			} else {
				throw new Error("reader.result is not string");
			}
		};
	});
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
				const files: Array<{ name: string; content: string }> = [];
				for (const file of data.files) {
					const name = file.name;
					const content = await fileToBase64(file);
					files.push({ name, content });
				}
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
			<input type="file" {...register("files")} />
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
			<TweetForm />
		</div>
	);
};
