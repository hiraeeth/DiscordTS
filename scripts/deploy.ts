import "dotenv/config";
import { install_console } from "@/lib/logger";
import { deploy_commands } from "engine";

install_console();

deploy_commands().catch((error) => {
	console.error(error);
	process.exit(1);
});
