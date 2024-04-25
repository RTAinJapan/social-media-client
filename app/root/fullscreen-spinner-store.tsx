import { create } from "zustand";

interface State {
	show: boolean;
	setShow: (show: boolean) => void;
}

const fullscreenSpinnerStore = create<State>((set) => ({
	show: false,
	setShow: (show) => {
		set({ show });
	},
}));

export const useFullscreenSpinnerShow = () => {
	const show = fullscreenSpinnerStore((state) => state.show);
	return show;
};

export const useSetFullscreenSpinnerShow = () => {
	const setShow = fullscreenSpinnerStore((state) => state.setShow);
	return setShow;
};
