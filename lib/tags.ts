import color from "@/lib/colors";
import { config } from "config";
import type { Color } from "@/helpers/color";

function fg(value: Color): string {
	return `\x1b[38;2;${value.r};${value.g};${value.b}m`;
}

const options = config.console;
const bullet = `${fg(options.bullet_color)}${options.bullet}${color.reset}`;
const highlight = fg(options.accent);

function label(text: string, value: Color): string {
	return `${fg(value)}${text}${color.reset} ${bullet}`;
}

export const tags = {
	app: label(options.app.text, options.app.color),
	bot: label(options.bot.text, options.bot.color),
	accent: (value: string | number): string => `${highlight}${value}${color.reset}`,
};
