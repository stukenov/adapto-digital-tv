import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // allow console logs when explicitly gated by env conditions in code
      "no-console": ["warn", { allow: ["warn", "error", "info", "log"] }],
    },
  },
];

export default eslintConfig;
