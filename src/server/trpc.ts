import { TRPCError, initTRPC } from "@trpc/server";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { SESSION_COOKIE_NAME } from "./constant.js";
import { validateSession } from "./validate-session.js";

export const createContext = async ({
	req,
	res,
}: CreateFastifyContextOptions) => {
	return {
		req,
		res,
	};
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;

const middleware = t.middleware;

const errorLoggerMiddleware = middleware(async (opts) => {
	const res = await opts.next();
	if (!res.ok) {
		console.error(res.error);
	}
	return res;
});

export const publicProcedure = t.procedure.use(errorLoggerMiddleware);

const authorizedMiddleware = middleware(async (opts) => {
	const sessionToken = opts.ctx.req.cookies[SESSION_COOKIE_NAME];

	if (!sessionToken) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}

	const session = await validateSession(sessionToken);
	if (!session) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}

	return opts.next({
		ctx: {
			session,
		},
	});
});

export const authorizedProcedure = publicProcedure.use(authorizedMiddleware);
