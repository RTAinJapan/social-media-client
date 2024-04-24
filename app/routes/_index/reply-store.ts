import { create } from "zustand";

export const useReplyStore = create<{
	reply: string | null;
	setReply: (tweetId: string) => void;
	clearReply: () => void;
}>((set) => ({
	reply: null,
	setReply: (tweetId) => {
		set({ reply: tweetId });
	},
	clearReply: () => {
		set({ reply: null });
	},
}));
