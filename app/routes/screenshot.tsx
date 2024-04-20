import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from "@remix-run/node";
import { assertSession } from "../session.server";
import { css } from "../../styled-system/css";
import { Button } from "@radix-ui/themes";
import { Form } from "@remix-run/react";
import { takeScreenshot } from "../puppeteer.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	await assertSession(request);
	return json(null);
};

export default function ScreenshotPage() {
	return (
		<div className={css({ display: "grid", justifyContent: "center" })}>
			<Form method="post">
				<Button type="submit">Take Screenshot</Button>
			</Form>
		</div>
	);
}

export const action = async ({ request }: ActionFunctionArgs) => {
	await assertSession(request);
	await takeScreenshot();
	return json(null);
};
