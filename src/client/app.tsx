import { StrictMode } from "react";
import { TrpcProvider } from "./trpc";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";

export const App = () => {
	return (
		<StrictMode>
			<TrpcProvider>
				<RouterProvider router={router} />
			</TrpcProvider>
		</StrictMode>
	);
};
