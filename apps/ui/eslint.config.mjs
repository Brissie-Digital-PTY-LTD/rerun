import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['**/*actions.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportNamedDeclaration[exportKind="type"][declaration=null]',
          message: "Next's 'use server' transform registers `export type { X }` as a runtime server action, which throws ReferenceError on every request to the route. Import the type from its source module at the consumer instead.",
        },
        {
          selector: 'ExportNamedDeclaration > ExportSpecifier[exportKind="type"]',
          message: "Next's 'use server' transform may register `export { type X }` as a runtime server action. Import the type from its source module at the consumer instead.",
        },
      ],
    },
  },
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/use-memo': 'warn',
      'react/no-unescaped-entities': 'warn',
    },
  },
  globalIgnores(['lib/hairline/*.js']),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
