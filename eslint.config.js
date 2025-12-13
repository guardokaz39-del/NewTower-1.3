const typescriptParser = require("@typescript-eslint/parser");
const typescriptPlugin = require("@typescript-eslint/eslint-plugin");
const prettierPlugin = require("eslint-plugin-prettier");

module.exports = [
    {
        files: ["src/**/*.ts"],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: "module"
            }
        },
        plugins: {
            "@typescript-eslint": typescriptPlugin,
            "prettier": prettierPlugin
        },
        rules: {
            ...typescriptPlugin.configs.recommended.rules,
            "prettier/prettier": "error",
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/explicit-module-boundary-types": "off"
        }
    }
];
