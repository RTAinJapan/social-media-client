import { BskyAgent } from "@atproto/api";
import { env } from "../env.server";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import mime from "mime-types";

let blueskyEnabled = false;
export const getBlueskyEnabled = () => blueskyEnabled;

const agent = new BskyAgent({ service: "https://bsky.social" });

if (env.BLUESKY_USERNAME && env.BLUESKY_PASSWORD) {
	blueskyEnabled = true;
	await agent.login({
		identifier: env.BLUESKY_USERNAME,
		password: env.BLUESKY_PASSWORD,
	});
	console.log("Logged in to Bluesky");
}

const uploadFile = async (filePath: string) => {
	const ext = extname(filePath);
	const contentType = mime.lookup(ext) || "application/octet-stream";
	const data = await readFile(filePath);
	const res = await agent.uploadBlob(data, { encoding: contentType });
	return res.data.blob;
};

export const post = async (text: string, files: string[]) => {
	const uploadResults = await Promise.all(files.map(uploadFile));
	await agent.post({
		text,
		embed: {
			$type: "app.bsky.embed.images",
			images: uploadResults.map((result) => ({
				image: result,
				alt: "", // TODO: allow setting alt text
			})),
		},
	});
};
