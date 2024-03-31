import { defineConfig } from "vite";
import { vitePlugin as remix } from "@remix-run/dev";

export default defineConfig({
	plugins: [remix()],
	build: {
		target: ["chrome120", "node20"],
	},
	clearScreen: false,
});
