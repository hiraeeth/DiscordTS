import { Route, BaseRoute, RouteContext } from "engine";

@Route("/files/[...path]")
export default class FilesRoute extends BaseRoute {
	async GET({ params }: RouteContext<{ path: string }>) {
		return { path: params.path };
	}
}
