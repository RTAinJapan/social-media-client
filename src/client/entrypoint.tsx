import "modern-normalize";

import { App } from "./app";
import { createRoot } from "react-dom/client";

const rootElement = document.getElementById("root");
if (rootElement) {
	createRoot(rootElement).render(<App />);
}
