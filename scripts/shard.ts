import "dotenv/config";
import { ShardingManager } from "discord.js";
import { install_console } from "@/lib/logger";
import { load_env } from "engine";
import { tags } from "@/lib/tags";

install_console();

const env = load_env();
const manager = new ShardingManager("dist/index.js", { token: env.token, totalShards: "auto" });

manager.on("shardCreate", (shard) => {
	console.log(`${tags.app} Launched shard ${tags.accent(shard.id)}.`);
});

manager.spawn();
