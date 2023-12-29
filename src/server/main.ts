import fastify from "fastify";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import {
	fastifyTRPCPlugin,
	type FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import { env } from "./env.js";
import { createContext } from "./trpc.js";
import { appRouter, type AppRouter } from "./router.js";
import { setupTwitterPage } from "./puppeteer.js";

const server = fastify({
	maxParamLength: 5000,
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
