import type { PropsWithChildren, ReactNode } from "react";
import { useHydrated } from "../hooks/use-hydrated";

export const ClientOnly = ({
	children,
	fallback = null,
}: PropsWithChildren<{ fallback?: ReactNode }>) => {
	const hydrated = useHydrated();
	return hydrated ? children : fallback;
};
