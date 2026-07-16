import { Route, BaseRoute, RouteContext, RouteSchemas, z } from "engine";

const body = z.object({ content: z.string() });

@Route("/guilds/[id]")
export default class GuildRoute extends BaseRoute {
	schema: RouteSchemas = {
		POST: { body },
	};

	async GET({ client, params }: RouteContext<{ id: string }>) {
		const guild = client.guilds.cache.get(params.id);
		return { id: params.id, name: guild ? guild.name : null };
	}

	async POST({ params, body }: RouteContext<{ id: string }, z.infer<typeof body>>) {
		return { id: params.id, content: body.content };
	}
}
