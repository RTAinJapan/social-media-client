import { useSyncExternalStore } from "react";

const subscribe = () => {
	return () => {
		// do nothing
	};
};

export const useHydrated = () => {
	return useSyncExternalStore(
		subscribe,
		() => true,
		() => false
	);
};
