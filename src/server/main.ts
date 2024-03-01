import fastify from "fastify";
import helmet from "@fastify/helmet";
import {
	createRequestHandler,
	type RequestHandler,
} from "@mcansh/remix-fastify";
import { fastifyStatic } from "@fastify/static";
import * as path from "path";

const server = fastify({
	maxParamLength: 5000,
	bodyLimit: 10_000_000,
});

await server.register(helmet, {
	hsts: process.env.NODE_ENV === "production",
	contentSecurityPolicy: false,
});

let handler: RequestHandler<typeof server.server>;

if (process.env.NODE_ENV === "production") {
	await server.register(fastifyStatic, {
		root: path.join(import.meta.dirname, "../build/client/assets"),
		prefix: "/assets",
		cacheControl: true,
		maxAge: "1y",
		immutable: true,
		lastModified: true,
	});

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
	host: process.env["SERVER_HOSTNAME"],
	port: parseInt(process.env["SERVER_PORT"] ?? "3000"),
});

console.log(`server listening on ${address}`);
