import { BlobRef, BskyAgent } from "@atproto/api";
import { env } from "../env.server";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { tmpDir } from "../tmp-dir.server";
import { prisma } from "../prisma.server";
import {
	isThreadViewPost,
	type PostView,
} from "@atproto/api/dist/client/types/app/bsky/feed/defs";

let blueskyEnabled = false;
export const getBlueskyEnabled = () => blueskyEnabled;

const agent = new BskyAgent({ service: "https://bsky.social" });

let selfDid: string;

export const getPosts = async () => {
	try {
		const feed = await agent.getAuthorFeed({
			actor: selfDid,
			filter: "posts_and_author_threads",
			limit: 100,
		});
		await Promise.all(
			feed.data.feed.map(async ({ post }) => {
				const id = post.uri;
				const record = post.record as { text: string; createdAt: string };
				const text = record.text;
				const createdAt = new Date(record.createdAt);
				await prisma.blueskyPosts.upsert({
					create: {
						postId: id,
						text,
						postedAt: createdAt,
					},
					where: { postId: id },
					update: {
						text,
						postedAt: createdAt,
					},
				});
			})
		);
	} catch (error) {
		console.error(error);
	}
};

if (env.BLUESKY_USERNAME && env.BLUESKY_PASSWORD) {
	blueskyEnabled = true;
	await agent.login({
		identifier: env.BLUESKY_USERNAME,
		password: env.BLUESKY_PASSWORD,
	});
	const selfProfile = await agent.getProfile({ actor: env.BLUESKY_USERNAME });
	selfDid = selfProfile.data.did;
	console.log(`Logged in to Bluesky as ${env.BLUESKY_USERNAME} (${selfDid})`);
	await getPosts();
}

const FILE_SIZE_LIMIT = 1_000_000; // 1 million bytes or 976.56 KB

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

const makeEmbed = (uploads: BlobRef[], quote: PostView | null) => {
	if (quote && uploads.length > 0) {
		return {
			$type: "app.bsky.embed.recordWithMedia",
			media: {
				$type: "app.bsky.embed.images",
				images: uploads.map((result) => ({
					image: result,
					alt: "", // TODO: allow setting alt text
				})),
			},
			record: {
				$type: "app.bsky.embed.record",
				record: {
					uri: quote.uri,
					cid: quote.cid,
				},
			},
		};
	}

	if (quote && uploads.length === 0) {
		return {
			$type: "app.bsky.embed.record",
			record: {
				uri: quote.uri,
				cid: quote.cid,
			},
		};
	}

	return {
		$type: "app.bsky.embed.images",
		images: uploads.map((result) => ({
			image: result,
			alt: "", // TODO: allow setting alt text
		})),
	};
};

export const post = async (
	text: string,
	files: string[],
	replyTo?: string,
	quotePostId?: string
) => {
	const replyPostThreadData = replyTo
		? await agent.getPostThread({ uri: replyTo })
		: null;
	// console.log(JSON.stringify(replyPost?.data, null, 2));
	// throw new Error("tmp!!!");
	const replyPost =
		replyPostThreadData && isThreadViewPost(replyPostThreadData.data.thread)
			? replyPostThreadData.data.thread.post
			: null;

	const quotePostThreadData = quotePostId
		? await agent.getPostThread({ uri: quotePostId })
		: null;

	const quotePost =
		quotePostThreadData && isThreadViewPost(quotePostThreadData.data.thread)
			? quotePostThreadData.data.thread.post
			: null;

	const replyPostRecord = replyPost?.record as
		| { reply?: { root?: { uri: string; cid: string } } }
		| undefined;
	const rootPost = replyPostRecord?.reply?.root ?? replyPost;

	const uploadResults = await Promise.all(files.map(uploadFile));
	await agent.post({
		text,
		embed: makeEmbed(uploadResults, quotePost),
		reply:
			replyPost && rootPost
				? {
						parent: { uri: replyPost.uri, cid: replyPost.cid },
						root: { uri: rootPost.uri, cid: rootPost.cid },
				  }
				: undefined,
	});
	await getPosts();
};

export const deletePost = async (postId: string) => {
	await agent.deletePost(postId);
};
