import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

export const secretManagerClient = new SecretsManagerClient({
	region: "ap-northeast-1",
});
