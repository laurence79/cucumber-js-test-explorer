// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginImportX from 'eslint-plugin-import-x';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/**/*.*'],
  },

  eslintPluginImportX.flatConfigs.recommended,
  eslintPluginImportX.flatConfigs.typescript,

  {
    rules: {
      'import-x/no-unresolved': [2, { ignore: ['^vscode$'] }],
      'import-x/order': 'error',
      'import-x/prefer-default-export': 'error',
    },
  },

  eslint.configs.recommended,
  eslintPluginPrettierRecommended,

  // eslint-disable-next-line import-x/no-named-as-default-member
  ...tseslint.configs.strictTypeChecked,
  // eslint-disable-next-line import-x/no-named-as-default-member
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.js', '*.mjs', '*.cjs'],
          defaultProject: 'tsconfig.json',
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    files: ['*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  {
    files: ['*.js', '*.mjs', '*.cjs'],
    rules: {
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
    },
  },
);
