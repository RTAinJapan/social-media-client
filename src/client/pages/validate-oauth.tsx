import { useEffect, useRef } from "react";
import { trpc } from "../trpc";
import { useNavigate } from "react-router-dom";

export const Component = () => {
	const navigate = useNavigate();
	const { mutate } = trpc.authorization.validate.useMutation({
		onSuccess: () => {
			navigate({ pathname: "/" });
		},
		onError: () => {
			alert("認証に失敗しました");
		},
	});

	const running = useRef(false);
	useEffect(() => {
		if (running.current) {
			return;
		}
		running.current = true;

		const params = new URLSearchParams(window.location.search);
		mutate({
			code: params.get("code") ?? "",
			state: params.get("state") ?? "",
		});
	}, []);

	return null;
};
