import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config({ ignores: ["dist", "node_modules", "lib/generated"] }, js.configs.recommended, ...tseslint.configs.recommended, prettier, {
	rules: {
		"no-control-regex": "off",
		"@typescript-eslint/no-explicit-any": "off",
		"@typescript-eslint/no-unsafe-function-type": "off",
		"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
	},
});
