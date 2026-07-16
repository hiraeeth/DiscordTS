export interface Env {
	token: string;
	client_id: string;
}

export function load_env(): Env {
	const token = process.env.TOKEN;
	const client_id = process.env.CLIENT_ID;

	const missing: string[] = [];
	if (!token) missing.push("TOKEN");
	if (!client_id) missing.push("CLIENT_ID");

	if (missing.length > 0) {
		throw new Error(`Missing required environment variables: ${missing.join(", ")}. Copy .env.example to .env and fill them in.`);
	}

	return { token: token as string, client_id: client_id as string };
}
