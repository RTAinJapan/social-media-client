import puppeteer from "puppeteer";
import { env } from "./env.js";

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
		page.close();
	}
};
