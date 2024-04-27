import { json, type ActionFunctionArgs } from "@remix-run/node";
import { z } from "zod";
import { deleteTweet } from "../api/twitter.server";
import { prisma } from "../prisma.server";

const actionParamsSchema = z.object({
	tweetId: z.string().regex(/^[0-9]+$/),
});

export const action = async ({ params }: ActionFunctionArgs) => {
	const { tweetId } = actionParamsSchema.parse(params);
	await deleteTweet(tweetId);
	await prisma.tweets.delete({
		where: { tweetId: tweetId },
	});
	return json({});
};
