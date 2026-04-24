import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "tests/**", // Test files use jest/mock patterns that conflict with strict TS rules
    "scripts/**",
    "functions/**",
  ]),
  // Relax some rules for specific patterns
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // These are intentionally lenient for mock/utility code
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "warn",
    },
  },
]);

export default eslintConfig;
