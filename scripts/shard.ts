import "dotenv/config";
import { ShardingManager } from "discord.js";
import { install_console } from "@/lib/logger";
import { load_env } from "engine";
import color from "@/lib/colors";

install_console();

const env = load_env();
const manager = new ShardingManager("dist/index.js", { token: env.token, totalShards: "auto" });

manager.on("shardCreate", (shard) => {
	console.log(`${color.fg.cyan}App ${color.reset}‣ Launched shard ${color.fg.cyan}${shard.id}${color.reset}.`);
});

manager.spawn();
