import { BskyAgent } from "@atproto/api";
import { env } from "../env.server";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { tmpDir } from "../tmp-dir.server";

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

const FILE_SIZE_LIMIT = 1_000_000; // 1 million bytes / 976.56 KB

const scaleImage = async (
	inputPath: string,
	outputPath: string,
	quality = 100
) => {
	await sharp(inputPath).jpeg({ quality }).toFile(outputPath);
	const outputFileStat = await fs.stat(outputPath);
	if (outputFileStat.size < FILE_SIZE_LIMIT) {
		return;
	}
	await scaleImage(inputPath, outputPath, quality - 5);
};

const uploadFile = async (filePath: string) => {
	const scaleOutputPath = path.join(tmpDir, `${crypto.randomUUID()}.jpeg`);
	await scaleImage(filePath, scaleOutputPath);
	const data = await fs.readFile(scaleOutputPath);
	const res = await agent.uploadBlob(data, { encoding: "image/jpeg" });
	await fs.rm(scaleOutputPath);
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
