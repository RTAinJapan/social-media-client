import { createBrowserRouter } from "react-router-dom";

export const router = createBrowserRouter([
	{
		path: "/",
		lazy: () => import("./pages/index.js"),
	},
	{
		path: "/validate-oauth",
		lazy: () => import("./pages/validate-oauth.js"),
	},
]);
