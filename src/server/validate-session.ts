import { prisma } from "./prisma.js";

export const validateSession = async (sessiontoken: string) => {
	const session = await prisma.session.findUnique({
		where: {
			token: sessiontoken,
		},
		include: {
			user: true,
		},
	});

	if (!session) {
		return;
	}

	return session.user;
};
