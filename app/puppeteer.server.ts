import puppeteer from "puppeteer";
import { env } from "./env.server.js";
import { prisma } from "./prisma.server.js";

const twitterUsername = env.TWITTER_USERNAME;
const twitterPassword = env.TWITTER_PASSWORD;

const browser = await puppeteer.launch({
	headless: env.PUPPETEER_HEADLESS,
	args: env.NODE_ENV === "production" ? ["--no-sandbox"] : [],
	defaultViewport: {
		width: 1920,
		height: 1080,
	},
});

const chromeUserAgent =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const setupTwitterLogin = async () => {
	const loginPage = await browser.newPage();
	await loginPage.setUserAgent(chromeUserAgent);
	await loginPage.goto("https://twitter.com/login");
	await loginPage.waitForNetworkIdle();
	const usernameInput = await loginPage.waitForSelector("input[name=text]");
	await usernameInput?.type(twitterUsername);
	const nextSpans = await loginPage.$$("span");
	for (const span of nextSpans) {
		const text = await span.evaluate((el) => el.textContent);
		if (text === "Next") {
			await span.click();
			break;
		}
	}
	const passwordInput = await loginPage.waitForSelector("input[name=password]");
	await passwordInput?.type(twitterPassword);
	const loginSpans = await loginPage.$$("span");
	for (const span of loginSpans) {
		const text = await span.evaluate((el) => el.textContent);
		if (text === "Log in") {
			await span.click();
			break;
		}
	}
	const confirmEmail = async () => {
		const emailInput = await loginPage.waitForSelector(
			'input[data-testid="ocfEnterTextTextInput"]'
		);
		await emailInput?.type(env.TWITTER_USER_EMAIL);
		await emailInput?.press("Enter");
		await loginPage.waitForNavigation();
	};
	const timeout = async () => {
		await sleep(10000);
		console.error("Setup Twitter timeout (10s)");
		const input = await loginPage.waitForSelector("input");
		const inputDataTestId = await input?.evaluateHandle((el) =>
			el.getAttribute("data-testid")
		);
		console.error("Input data-testid", inputDataTestId?.toString());
		throw new Error("timeout");
	};
	await Promise.race([
		loginPage.waitForNavigation(),
		confirmEmail(),
		timeout(),
	]);
	await loginPage.close();
};

const MAX_TWEETS = 5;

export const getTweets = async () => {
	const page = await browser.newPage();
	await page.setUserAgent(chromeUserAgent);
	try {
		await page.setViewport({
			width: 1920,
			height: 1080,
		});
		await page.goto(`https://twitter.com/${twitterUsername}`);
		await page.waitForSelector("article[data-testid=tweet]");
		const tweets = await page.$$("article[data-testid=tweet]");
		await Promise.all(
			tweets.slice(0, MAX_TWEETS).map(async (tweetElement) => {
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
				const id = link.split("/").pop()!;
				const tweetText = text?.replace(/\n/g, " ");
				const tweetTime = new Date(time);

				await prisma.tweets.upsert({
					where: { tweetId: id },
					create: {
						tweetId: id,
						text: tweetText ?? "",
						tweetedAt: tweetTime,
					},
					update: {
						text: tweetText,
						tweetedAt: tweetTime,
					},
				});
			})
		);
	} finally {
		await page.close();
	}
};

export const tweet = async (text: string, files: string[]) => {
	const page = await browser.newPage();
	await page.setUserAgent(chromeUserAgent);
	try {
		page.goto("https://twitter.com/");

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
	} finally {
		await page.close();
	}
};

export const deleteTweet = async (tweetId: string) => {
	const page = await browser.newPage();
	await page.setUserAgent(chromeUserAgent);
	try {
		await page.goto(`https://twitter.com/${twitterUsername}/status/${tweetId}`);
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
	const page = await browser.newPage();
	await page.setUserAgent(chromeUserAgent);
	try {
		await page.goto(`https://twitter.com/${twitterUsername}/status/${tweetId}`);
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
	} finally {
		await page.close();
	}
};
