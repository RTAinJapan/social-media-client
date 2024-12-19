import { create } from "zustand";

export const useQuoteStore = create<{
	twitterId?: string;
	blueskyId?: string;
	setQuote: (args: { twitterId?: string; blueskyId?: string }) => void;
	clearQuote: () => void;
}>((set) => ({
	setQuote: ({ twitterId, blueskyId }) => {
		set({ twitterId, blueskyId });
	},
	clearQuote: () => {
		set({ twitterId: undefined, blueskyId: undefined });
	},
}));
