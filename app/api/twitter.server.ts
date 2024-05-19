import * as path from "path";
import * as puppeteer from "puppeteer";
import { env } from "../env.server.js";
import { prisma } from "../prisma.server.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const chromeUserAgent =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const username = env.TWITTER_USERNAME;
const password = env.TWITTER_PASSWORD;
const userEmail = env.TWITTER_USER_EMAIL;

let browser: puppeteer.Browser;
let loginPage: puppeteer.Page;

let twitterEnabled = false;
export const getTwitterEnabled = () => {
	return twitterEnabled;
};

let waitingForConfirmationCode = false;
export const getWaitingForConfirmationCode = () => {
	return waitingForConfirmationCode;
};

const newPage = async (url: string) => {
	const page = await browser.newPage();
	await page.setUserAgent(chromeUserAgent);
	await page.goto(url);
	return page;
};

const screenshot = async (page: puppeteer.Page) => {
	if (!env.PUPPETEER_SCREENSHOT_PATH) {
		return;
	}
	await page.screenshot({
		path: path.join(env.PUPPETEER_SCREENSHOT_PATH, `twitter-${Date.now()}.png`),
	});
};

export const takeScreenshot = async () => {
	const page = await newPage("https://twitter.com/");
	await sleep(10_000);
	await screenshot(page);
	await page.close();
};

if (username && password && userEmail) {
	twitterEnabled = true;

	browser = await puppeteer.launch({
		headless: env.PUPPETEER_HEADLESS,
		args: env.NODE_ENV === "production" ? ["--no-sandbox"] : [],
		defaultViewport: { width: 1920, height: 1080 },
	});

	loginPage = await newPage("https://twitter.com/login");

	let recorder: puppeteer.ScreenRecorder | undefined;

	if (env.PUPPETEER_SCREENSHOT_PATH) {
		recorder = await loginPage.screencast({
			path: `${path.join(
				env.PUPPETEER_SCREENSHOT_PATH,
				`twitter-${Date.now()}`
			)}.webm`,
		});
	}

	const abortController = new AbortController();

	try {
		const usernameInput = await loginPage.waitForSelector("input[name=text]");
		await usernameInput?.type(username);
		await usernameInput?.press("Enter");

		const passwordInput = await loginPage.waitForSelector(
			"input[name=password]"
		);
		await passwordInput?.type(password);
		await passwordInput?.press("Enter");

		const waitForFinish = async () => {
			await loginPage.waitForNavigation();
			console.log("Login finished");
			await screenshot(loginPage);
			if (!abortController.signal.aborted) {
				abortController.abort();
				await loginPage.close();
			}
			await getTweets();
		};

		const confirmation = async () => {
			const input = await loginPage.waitForSelector(
				'input[data-testid="ocfEnterTextTextInput"]',
				{ signal: abortController.signal }
			);
			const inputType = await input?.evaluate((el) => el.getAttribute("type"));
			if (inputType === "email") {
				await input?.type(userEmail);
				await input?.press("Enter");
				console.log("Email confirmation finished");
				await loginPage.waitForNavigation();
				if (!abortController.signal.aborted) {
					abortController.abort();
					await loginPage.close();
				}
			} else {
				waitingForConfirmationCode = true;
				console.log("Wait for confirmation code");
				abortController.abort();
			}
		};

		await Promise.race([waitForFinish(), confirmation()]);
	} catch (error) {
		if (!abortController.signal.aborted) {
			console.error(error);
		}
	} finally {
		if (recorder) {
			await recorder.stop();
		}
	}
}

export const inputConfirmationCode = async (code: string) => {
	if (loginPage.isClosed()) {
		return;
	}
	try {
		const input = await loginPage.$(
			'input[data-testid="ocfEnterTextTextInput"]'
		);
		if (!input) {
			throw new Error("No input");
		}
		await input.type(code);
		await input.press("Enter");
		await loginPage.waitForNavigation();
		waitingForConfirmationCode = false;
	} finally {
		await loginPage.close();
	}
};

export const getTweets = async () => {
	const page = await newPage(`https://twitter.com/${username}`);
	try {
		await page.setViewport({ width: 1280, height: 2000 });
		await page.waitForSelector("article[data-testid=tweet]");
		const tweets = await page.$$("article[data-testid=tweet]");
		await Promise.all(
			tweets.slice(0, 10).map(async (tweetElement) => {
				const textElement = await tweetElement.$("div[data-testid=tweetText]");
				const text = await textElement?.evaluate((el) => el.textContent);
				const timeElement = await tweetElement.waitForSelector("time");
				if (!timeElement) {
					return;
				}
				const time = await timeElement.evaluate((el) =>
					el.getAttribute("datetime")
				);
				if (!time) {
					return;
				}
				const linkElement = await tweetElement.waitForSelector(
					"a[href*='/status/']"
				);
				if (!linkElement) {
					return;
				}
				const link = await linkElement.evaluate((el) =>
					el.getAttribute("href")
				);
				if (!link) {
					return;
				}
				const id = link.split("/").pop();
				if (!id) {
					throw new Error("No tweet ID");
				}

				const tweetTime = new Date(time);

				await prisma.tweets.upsert({
					where: { tweetId: id },
					create: {
						tweetId: id,
						text: text ?? "",
						tweetedAt: tweetTime,
					},
					update: {
						text: text ?? undefined,
						tweetedAt: tweetTime,
					},
				});
			})
		);
	} catch (error) {
		console.error("error in getTweets", error);
	} finally {
		await page.close();
	}
};

export const tweet = async (text: string, files: string[]) => {
	const page = await newPage("https://twitter.com/");
	try {
		const label = await page.waitForSelector(
			'label[data-testid="tweetTextarea_0_label"]'
		);
		if (!label) {
			throw new Error("No tweet input label");
		}
		await label.click({ count: 3 });
		await label.type(text);

		if (files.length >= 1) {
			const fileInput = await page.waitForSelector("input[type=file]");
			if (!fileInput) {
				throw new Error("No file input");
			}
			await fileInput.uploadFile(...files);
			await page.waitForSelector('div[data-testid="attachments"]');
		}

		const tweetButton = await page.waitForSelector(
			'div[data-testid="tweetButtonInline"]:not([aria-disabled="true"])'
		);
		if (!tweetButton) {
			throw new Error("No tweet button");
		}
		await tweetButton.click({ count: 2 });
		await page.waitForSelector("div[data-testid=toast]");
		await getTweets();
	} catch (error) {
		if (env.PUPPETEER_SCREENSHOT_PATH) {
			await page.screenshot({
				path: path.join(
					env.PUPPETEER_SCREENSHOT_PATH,
					`tweet-${Date.now()}.png`
				),
			});
		}
		throw error;
	} finally {
		await page.close();
	}
};

export const deleteTweet = async (tweetId: string) => {
	const page = await newPage(
		`https://twitter.com/${username}/status/${tweetId}`
	);
	try {
		const menu = await page.waitForSelector("div[data-testid=caret]");
		if (!menu) {
			throw new Error("No menu");
		}
		await menu.click();
		await sleep(500);
		const deleteOption = await page.waitForSelector(
			"div[data-testid=Dropdown] > div:nth-child(1)"
		);
		if (!deleteOption) {
			throw new Error("No delete option");
		}
		await deleteOption.click();
		await sleep(500);
		const confirmButton = await page.waitForSelector(
			"div[data-testid=confirmationSheetConfirm]"
		);
		if (!confirmButton) {
			throw new Error("No confirm button");
		}
		await confirmButton.click();
		await sleep(500);
		await page.waitForNetworkIdle();
	} finally {
		await page.close();
	}
};

export const sendReply = async (
	tweetId: string,
	text: string,
	files: string[]
) => {
	const page = await newPage(
		`https://twitter.com/${username}/status/${tweetId}`
	);
	try {
		const replyButton = await page.waitForSelector(
			"div[data-testid=reply]:not([aria-disabled=true])"
		);
		if (!replyButton) {
			throw new Error("No reply button");
		}
		await replyButton.click();
		await sleep(500);

		if (files.length >= 1) {
			const fileInput = await page.waitForSelector("input[type=file]");
			if (!fileInput) {
				throw new Error("No file input");
			}
			await fileInput.uploadFile(...files);
		}

		const label = await page.waitForSelector(
			'label[data-testid="tweetTextarea_0_label"]'
		);
		if (!label) {
			throw new Error("No tweet input label");
		}
		await label.click({ count: 3 });
		await label.type(text);
		const tweetButton = await page.waitForSelector(
			'div[data-testid="tweetButton"]:not([aria-disabled="true"])'
		);
		if (!tweetButton) {
			throw new Error("No tweet button");
		}
		await tweetButton.click({ count: 2 });
		await page.waitForSelector("div[data-testid=toast]");
		await getTweets();
	} finally {
		await page.close();
	}
};
