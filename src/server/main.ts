import fastify from "fastify";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import { env } from "../lib/env.server.js";
import {
	createRequestHandler,
	type RequestHandler,
} from "@mcansh/remix-fastify";

const server = fastify({
	maxParamLength: 5000,
	bodyLimit: 10_000_000,
});

await server.register(helmet, {
	hsts: env.NODE_ENV === "production",
	contentSecurityPolicy: false,
});

await server.register(cookie);

let handler: RequestHandler<typeof server.server>;

if (env.NODE_ENV === "production") {
	handler = createRequestHandler({
		// @ts-expect-error - this is fine
		build: await import("../../build/server/index.js"),
	});
} else {
	const vite = await import("vite");
	const devServer = await vite.createServer({
		server: { middlewareMode: true },
	});
	const { default: middie } = await import("@fastify/middie");
	await server.register(middie);
	await server.use(devServer.middlewares);

	handler = createRequestHandler({
		build: (() => devServer.ssrLoadModule("virtual:remix/server-build")) as any,
	});
}

await server.register(async (childServer) => {
	childServer.removeAllContentTypeParsers();
	childServer.addContentTypeParser("*", (_request, payload, done) => {
		done(null, payload);
	});
	childServer.all("*", handler);
});

const address = await server.listen({
	host: env.SERVER_HOSTNAME,
	port: env.SERVER_PORT,
});

console.log(`server listening on ${address}`);
