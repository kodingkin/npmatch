import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    ignores: [".next/**", "node_modules/**", "*.setup.tsx"],
  },
  {
    rules: {
      // Catch dead code that AI often generates
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
      }],
      // Warn on console.log — AI tends to leave these in
      "no-console": ["warn", { "allow": ["warn", "error"] }],
      // Prefer const over let when never reassigned
      "prefer-const": "error",
      // No empty catch blocks
      "no-empty": ["error", { "allowEmptyCatch": false }],
    },
  },
);
