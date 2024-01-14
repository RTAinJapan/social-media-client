import puppeteer from "puppeteer";
import { env } from "./env.js";
import { prisma } from "./prisma.js";

const twitterUsername = env.TWITTER_USERNAME;
const twitterPassword = env.TWITTER_PASSWORD;

const browser = await puppeteer.launch({
	headless: env.NODE_ENV === "production" ? "new" : false,
	args: env.NODE_ENV === "production" ? ["--no-sandbox"] : [],
});

const loginPage = await browser.newPage();

export const setupTwitterPage = async () => {
	if (!twitterPassword) {
		throw new Error("No twitter password");
	}
	await loginPage.goto("https://twitter.com/login");
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
	await loginPage.waitForNavigation();
	await loginPage.close();
};

const MAX_TWEETS = 5;

export const getTweets = async () => {
	const page = await browser.newPage();
	try {
		await page.goto(`https://twitter.com/${twitterUsername}`);
		const tweetsSelector = Array.from({ length: MAX_TWEETS })
			.map(() => "div[data-testid=cellInnerDiv]")
			.join(" + ");
		await page.waitForSelector(tweetsSelector);
		const tweets = await page.$$("div[data-testid=cellInnerDiv]");
		await Promise.all(
			tweets.slice(0, MAX_TWEETS).map(async (tweetElement) => {
				const textElement = await tweetElement.waitForSelector(
					"div[data-testid=tweetText]"
				);
				if (!textElement) {
					return;
				}
				const text: string = await textElement.evaluate((el) => el.textContent);
				const timeElement = await tweetElement.waitForSelector("time");
				if (!timeElement) {
					return;
				}
				const time: string = await timeElement.evaluate((el) =>
					el.getAttribute("datetime")
				);
				const linkElement = await tweetElement.waitForSelector(
					"a[href*='/status/']"
				);
				if (!linkElement) {
					return;
				}
				const link: string = await linkElement.evaluate((el) =>
					el.getAttribute("href")
				);
				const id = link.split("/").pop()!;
				const tweetText = text.replace(/\n/g, " ");
				const tweetTime = new Date(time);

				await prisma.tweets.upsert({
					where: { tweetId: id },
					create: {
						tweetId: id,
						text: tweetText,
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
	try {
		page.goto("https://twitter.com/");
		if (files.length >= 1) {
			const fileInput = await page.waitForSelector("input[type=file]");
			await fileInput?.uploadFile(...files);
		}
		const label = await page.waitForSelector(
			'label[data-testid="tweetTextarea_0_label"]'
		);
		await label?.click({ count: 3 });
		await label?.type(text);
		const tweetButton = await page.waitForSelector(
			'div[data-testid="tweetButtonInline"]:not([aria-disabled="true"])'
		);
		await tweetButton?.click();
		await page.waitForNavigation();
	} finally {
		await page.close();
	}
};

export const deleteTweet = async (tweetId: string) => {
	const page = await browser.newPage();
	try {
		await page.goto(`https://twitter.com/${twitterUsername}/status/${tweetId}`);
		const menu = await page.waitForSelector("div[data-testid=caret]");
		if (!menu) {
			throw new Error("No menu");
		}
		await new Promise((resolve) => setTimeout(resolve, 500));
		await menu.click();
		const deleteOption = await page.waitForSelector(
			"div[data-testid=Dropdown] > div:nth-child(1)"
		);
		if (!deleteOption) {
			throw new Error("No delete option");
		}
		await new Promise((resolve) => setTimeout(resolve, 500));
		await deleteOption.click();
		const confirmButton = await page.waitForSelector(
			"div[data-testid=confirmationSheetConfirm]"
		);
		if (!confirmButton) {
			throw new Error("No confirm button");
		}
		await new Promise((resolve) => setTimeout(resolve, 500));
		await confirmButton.click();
		await page.waitForNetworkIdle();
	} finally {
		await page.close();
	}
};
