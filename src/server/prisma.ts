import { PrismaClient } from "@prisma/client";
import { GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { env } from "./env.js";
import { secretManagerClient } from "./aws/secret-manager.js";

let datasourceUrl = env.DATABASE_URL;

if (env.NODE_ENV === "production") {
	const result = await secretManagerClient.send(
		new GetSecretValueCommand({
			SecretId: env.DATABASE_URL_SECRET_ID,
		})
	);
	if (result.SecretString) {
		datasourceUrl = result.SecretString;
	}
}

export const prisma = new PrismaClient({
	datasourceUrl,
});
