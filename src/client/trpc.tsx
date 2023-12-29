import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AppRouter } from "../server/router.js";
import {
	TRPCClientError,
	createTRPCReact,
	httpBatchLink,
} from "@trpc/react-query";
import type { PropsWithChildren } from "react";

export const trpc = createTRPCReact<AppRouter>();

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: (failureCount, error) => {
				if (failureCount > 3) {
					return false;
				}
				if (!(error instanceof TRPCClientError)) {
					return true;
				}
				return error.data.httpStatus >= 500;
			},
		},
	},
});
const trpcClient = trpc.createClient({
	links: [
		httpBatchLink({
			url: `${import.meta.env.VITE_API_ORIGIN}/trpc`,
			fetch: (input, init) =>
				fetch(input, {
					credentials: "include",
					...init,
				}),
		}),
	],
});

export const TrpcProvider = ({ children }: PropsWithChildren) => {
	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</trpc.Provider>
	);
};
