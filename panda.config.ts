import { defineConfig } from "@pandacss/dev";

export default defineConfig({
	// Whether to use css reset
	preflight: true,

	// The extension for the emitted JavaScript files
	outExtension: "js",
	// Where to look for your css declarations
	include: ["./app/**/*.tsx"],

	// Files to exclude
	exclude: [],

	// Useful for theme customization
	theme: {
		extend: {},
	},

	// The output directory for your css system
	outdir: "styled-system",
});
