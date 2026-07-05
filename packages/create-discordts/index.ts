#!/usr/bin/env bun
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import prompts from "prompts";
import color from "picocolors";

const REPOSITORY = "hiraeeth/DiscordTS";
const BRANCH = "deployment";
const PRUNED = [
	".git",
	".github",
	"packages",
	"tests",
	"dist",
	"data",
	"logs",
	"node_modules",
	"bun.lock",
	"socket.yml",
	"CODE_OF_CONDUCT.md",
	"LICENSE",
	"Dockerfile",
	"docker-compose.yaml",
	".prettierrc",
	".prettierignore",
	"eslint.config.mjs",
];

interface Answers {
	directory: string;
	token: string;
	client_id: string;
	owners: string;
	git: boolean;
	install: boolean;
}

function fail(message: string): never {
	console.error(`${color.red("✖")} ${message}`);
	process.exit(1);
}

function step(message: string) {
	console.log(`${color.cyan("›")} ${message}`);
}

function validate_directory(input: string): true | string {
	if (input.trim().length === 0) return "A directory name is required.";
	if (!/^[a-zA-Z0-9._-]+$/.test(input)) return "Use only letters, numbers, dots, dashes and underscores.";
	return true;
}

function package_name(directory: string) {
	const name = directory
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/^[._-]+|[._-]+$/g, "");
	return name.length > 0 ? name : "discordts-bot";
}

async function collect_answers(positional: string | undefined, use_defaults: boolean): Promise<Answers> {
	if (use_defaults) {
		const directory = positional !== undefined ? positional : "my-bot";
		const validated = validate_directory(directory);
		if (validated !== true) fail(validated);
		return { directory, token: "", client_id: "", owners: "", git: true, install: true };
	}

	const skip_directory = positional !== undefined && validate_directory(positional) === true;
	const on_cancel = () => fail("Cancelled.");
	const answers = await prompts(
		[
			{
				type: skip_directory ? null : "text",
				name: "directory",
				message: "What is the name of the directory you want to create this project in?",
				initial: "my-bot",
				validate: validate_directory,
			},
			{
				type: "password",
				name: "token",
				message: "What is your Discord bot token? (leave empty to fill in .env later)",
				initial: "",
			},
			{
				type: "text",
				name: "client_id",
				message: "What is your application client id? (leave empty to fill in .env later)",
				initial: "",
			},
			{
				type: "text",
				name: "owners",
				message: "Bot owner user ids, comma separated (optional, powers the owner_only guard)",
				initial: "",
			},
			{
				type: "confirm",
				name: "git",
				message: "Initialize a git repository?",
				initial: true,
			},
			{
				type: "confirm",
				name: "install",
				message: "Install dependencies with bun?",
				initial: true,
			},
		],
		{ onCancel: on_cancel }
	);

	return {
		directory: skip_directory ? (positional as string) : answers.directory,
		token: answers.token,
		client_id: answers.client_id,
		owners: answers.owners,
		git: answers.git,
		install: answers.install,
	};
}

async function download_template(destination: string) {
	const staging = join(tmpdir(), `create-discordts-${process.pid}-${Date.now()}`);
	mkdirSync(staging, { recursive: true });

	const url = `https://codeload.github.com/${REPOSITORY}/tar.gz/refs/heads/${BRANCH}`;
	const response = await fetch(url);
	if (!response.ok) fail(`Failed to download the template (HTTP ${response.status} from GitHub).`);

	const archive = join(staging, "template.tar.gz");
	writeFileSync(archive, new Uint8Array(await response.arrayBuffer()));

	const extraction = spawnSync("tar", ["-xzf", archive, "-C", staging], { stdio: "ignore" });
	if (extraction.status !== 0) fail("Failed to extract the template archive. Make sure `tar` is available on your PATH.");

	const extracted = readdirSync(staging).find((entry) => entry !== "template.tar.gz");
	if (extracted === undefined) fail("The downloaded archive was empty.");

	cpSync(join(staging, extracted), destination, { recursive: true });
	rmSync(staging, { recursive: true, force: true });
}

function prune_template(destination: string) {
	for (const entry of PRUNED) {
		rmSync(join(destination, entry), { recursive: true, force: true });
	}
}

function patch_manifest(destination: string, name: string) {
	const path = join(destination, "package.json");
	const manifest = JSON.parse(readFileSync(path, "utf8"));
	manifest.name = name;
	manifest.version = "0.1.0";
	manifest.description = "A Discord bot built on DiscordTS-Base.";
	delete manifest.workspaces;
	writeFileSync(path, `${JSON.stringify(manifest, null, "\t")}\n`);
}

function write_env(destination: string, answers: Answers) {
	const lines = [
		`TOKEN="${answers.token.length > 0 ? answers.token : "BOT_TOKEN"}"`,
		`CLIENT_ID="${answers.client_id.length > 0 ? answers.client_id : "BOT_CLIENT_ID"}"`,
		`OWNERS="${answers.owners}"`,
		`API_TOKENS=""`,
	];
	writeFileSync(join(destination, ".env"), `${lines.join("\n")}\n`);
}

function initialize_git(destination: string) {
	const available = spawnSync("git", ["--version"], { stdio: "ignore" });
	if (available.status !== 0) {
		console.log(`${color.yellow("!")} git is not available, skipping repository initialization.`);
		return;
	}
	spawnSync("git", ["init", "--initial-branch=main"], { cwd: destination, stdio: "ignore" });
	spawnSync("git", ["add", "-A"], { cwd: destination, stdio: "ignore" });
	spawnSync("git", ["commit", "-m", "chore: scaffold from DiscordTS-Base"], { cwd: destination, stdio: "ignore" });
}

function install_dependencies(destination: string) {
	const result = spawnSync(process.execPath, ["install"], { cwd: destination, stdio: "inherit" });
	if (result.status !== 0) console.log(`${color.yellow("!")} Dependency installation failed, run ${color.bold("bun install")} manually.`);
}

function print_next_steps(answers: Answers) {
	const steps = [`cd ${answers.directory}`];
	if (!answers.install) steps.push("bun install");
	if (answers.token.length === 0 || answers.client_id.length === 0) steps.push("edit .env and fill in TOKEN and CLIENT_ID");
	steps.push("bun run deploy", "bun run dev");

	console.log(`\n${color.green("✔")} Created ${color.bold(answers.directory)}\n`);
	console.log(color.bold("Next steps:"));
	for (const entry of steps) console.log(`  ${color.cyan("•")} ${entry}`);
	console.log("");
}

async function main() {
	const argv = process.argv.slice(2);
	const use_defaults = argv.includes("-y") || argv.includes("--yes");
	const positional = argv.find((argument) => !argument.startsWith("-"));

	console.log(`\n${color.bold(color.cyan("create-discordts"))} ${color.dim("· scaffold a DiscordTS-Base Discord bot")}\n`);

	const answers = await collect_answers(positional, use_defaults);
	const destination = resolve(process.cwd(), answers.directory);
	if (existsSync(destination) && readdirSync(destination).length > 0) fail(`Directory ${color.bold(answers.directory)} already exists and is not empty.`);

	step("Downloading template...");
	await download_template(destination);
	prune_template(destination);
	patch_manifest(destination, package_name(answers.directory));
	write_env(destination, answers);

	if (answers.install) {
		step("Installing dependencies...");
		install_dependencies(destination);
	}

	if (answers.git) {
		step("Initializing git repository...");
		initialize_git(destination);
	}

	print_next_steps(answers);
}

await main();
