import fastify from "fastify";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import {
	fastifyTRPCPlugin,
	type FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import { env } from "./env.js";
import { createContext } from "./trpc.js";
import { appRouter, type AppRouter } from "./router.js";
import { setupTwitterPage } from "./puppeteer.js";
import * as path from "node:path";
import * as fs from "node:fs";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { SESSION_COOKIE_NAME } from "./constant.js";
import { validateSession } from "./validate-session.js";
import { tmpdir } from "./tmpdir.js";

const server = fastify({
	maxParamLength: 5000,
	bodyLimit: 10_000_000,
});

await server.register(cors, {
	origin: [env.CLIENT_ORIGIN],
	credentials: true,
});

await server.register(helmet, {
	hsts: env.NODE_ENV === "production",
});

await server.register(cookie);

await server.register(fastifyTRPCPlugin, {
	prefix: "/trpc",
	trpcOptions: {
		createContext,
		router: appRouter,
	},
} satisfies FastifyTRPCPluginOptions<AppRouter>);

await server.register(multipart);

server.post("/file", async (req, res) => {
	const sessionToken = req.cookies[SESSION_COOKIE_NAME];
	console.log(sessionToken);
	if (!sessionToken) {
		res.status(401);
		return;
	}
	const user = await validateSession(sessionToken);
	if (!user) {
		res.status(401);
		return;
	}

	const filenames: string[] = [];
	for await (const data of req.files()) {
		const extension = path.extname(data.filename);
		const filename = randomUUID() + extension;
		const filepath = path.join(tmpdir, filename);
		const stream = fs.createWriteStream(filepath);
		await pipeline(data.file, stream);
		filenames.push(filename);
	}

	res.send(filenames);
});

// Healthcheck endpoint
server.get("/", async () => {
	return { ok: true };
});

await setupTwitterPage();

const address = await server.listen({
	host: env.SERVER_HOSTNAME,
	port: env.SERVER_PORT,
});

console.log(`server listening on ${address}`);
