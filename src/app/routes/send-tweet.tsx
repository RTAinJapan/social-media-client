import { json } from "@remix-run/node";
import { assertSession } from "../session.server";
import {
	type ActionFunctionArgs,
	unstable_parseMultipartFormData,
	unstable_createFileUploadHandler,
	unstable_composeUploadHandlers,
	unstable_createMemoryUploadHandler,
	NodeOnDiskFile,
} from "@remix-run/node";
import { zfd } from "zod-form-data";
import { z } from "zod";
import { getTweets, sendReply, tweet } from "../puppeteer.server";
import { tmpDir } from "../tmp-dir.server";

const actionSchema = zfd.formData({
	text: zfd.text(z.string().optional()),
	replyToTweetId: zfd.text(z.string().optional()),
});

export const action = async ({ request }: ActionFunctionArgs) => {
	await assertSession(request);

	const formData = await unstable_parseMultipartFormData(
		request,
		unstable_composeUploadHandlers(
			unstable_createFileUploadHandler({
				maxPartSize: 10_000_000,
				directory: tmpDir,
			}),
			unstable_createMemoryUploadHandler()
		)
	);

	const { text, replyToTweetId } = actionSchema.parse(formData);

	const files = formData.getAll("files");
	const filePaths: string[] = [];
	for (const file of files) {
		if (file instanceof NodeOnDiskFile) {
			filePaths.push(file.getFilePath());
		}
	}

	if (replyToTweetId) {
		await sendReply(replyToTweetId, text ?? "", filePaths);
	} else {
		await tweet(text ?? "", filePaths);
	}

	await getTweets().catch((error) => {
		console.error(error);
	});

	return json({});
};
