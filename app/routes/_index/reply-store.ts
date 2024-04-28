import { create } from "zustand";

export const useReplyStore = create<{
	twitterId?: string;
	blueskyId?: string;
	setReply: (args: { twitterId?: string; blueskyId?: string }) => void;
	clearReply: () => void;
}>((set) => ({
	setReply: ({ twitterId, blueskyId }) => {
		set({ twitterId, blueskyId });
	},
	clearReply: () => {
		set({ twitterId: undefined, blueskyId: undefined });
	},
}));
