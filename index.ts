import "dotenv/config";
import { install_console } from "@/lib/logger";
import { boot } from "engine";

install_console();

boot().catch((error) => {
	console.error(error);
	process.exit(1);
});
