import { Spinner } from "@radix-ui/themes";
import { css } from "../../styled-system/css";
import { useFullscreenSpinnerShow } from "./fullscreen-spinner-store";

export const FullscreenSpinner = () => {
	const show = useFullscreenSpinnerShow();
	if (!show) {
		return null;
	}
	return (
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
		</div>
	);
};
