import { Form } from "@remix-run/react";
import { Button } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";

export const SignOutButton = () => {
	const { t } = useTranslation();

	return (
		<Form method="post" action="/sign-out">
			<Button type="submit">{t("signOut")}</Button>
		</Form>
	);
};
