import { Spinner } from "@radix-ui/themes";
import { css } from "../../styled-system/css";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export const FullscreenSpinner = ({ show }: { show: boolean }) => {
	const [portalElement, setPortalElement] = useState<Element>();

	useEffect(() => {
		const element = document.querySelector("#spinner-portal");
		if (!element) {
			throw new Error("element #spinner-portal not found");
		}
		setPortalElement(element);
	}, []);

	if (!portalElement || !show) {
		return null;
	}

	return createPortal(
		<div
			className={css({
				position: "fixed",
				top: 0,
				left: 0,
				width: "100vw",
				height: "100vh",
				display: "grid",
				placeItems: "center",
				background: "rgba(0,0,0,0.5)",
			})}
		>
			<Spinner loading size="3" />
		</div>,
		portalElement
	);
};
